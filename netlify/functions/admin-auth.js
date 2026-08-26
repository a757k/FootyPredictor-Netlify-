import crypto from "node:crypto";

function base64url(value) {
  return Buffer
    .from(value)
    .toString("base64url");
}

function sign(value) {
  return crypto
    .createHmac(
      "sha256",
      process.env.ADMIN_SESSION_SECRET ||
        "CHANGE_THIS_SECRET"
    )
    .update(value)
    .digest("base64url");
}

function createToken(email) {
  const payload = base64url(
    JSON.stringify({
      email,
      expires:
        Date.now() +
        1000 * 60 * 60 * 8
    })
  );

  return (
    payload +
    "." +
    sign(payload)
  );
}

function verifyToken(token) {
  if (!token) {
    return null;
  }

  const parts =
    token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [
    payload,
    signature
  ] = parts;

  const expected =
    sign(payload);

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return null;
  }

  try {
    const data =
      JSON.parse(
        Buffer
          .from(
            payload,
            "base64url"
          )
          .toString()
      );

    if (
      data.expires <
      Date.now()
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export default async function handler(
  request
) {
  try {
    const url =
      new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname.endsWith(
        "/admin-auth"
      )
    ) {
      const {
        email,
        password
      } = await request.json();

      const adminEmail =
        process.env.ADMIN_EMAIL;

      const adminPassword =
        process.env.ADMIN_PASSWORD;

      if (
        !email ||
        !password ||
        !adminEmail ||
        !adminPassword
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Admin credentials are not configured."
          }),
          {
            status: 500,
            headers: {
              "content-type":
                "application/json"
            }
          }
        );
      }

      if (
        email.toLowerCase() !==
          adminEmail.toLowerCase() ||
        password !==
          adminPassword
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid admin credentials."
          }),
          {
            status: 401,
            headers: {
              "content-type":
                "application/json"
            }
          }
        );
      }

      const token =
        createToken(email);

      return new Response(
        JSON.stringify({
          ok: true,
          token
        }),
        {
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    if (
      request.method === "GET"
    ) {
      const authorization =
        request.headers.get(
          "authorization"
        );

      const token =
        authorization?.replace(
          /^Bearer\s+/i,
          ""
        );

      const data =
        verifyToken(token);

      if (!data) {
        return new Response(
          JSON.stringify({
            ok: false
          }),
          {
            status: 401,
            headers: {
              "content-type":
                "application/json"
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          email: data.email
        }),
        {
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    return new Response(
      "Not found",
      {
        status: 404
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error.message
      }),
      {
        status: 500,
        headers: {
          "content-type":
            "application/json"
        }
      }
    );
  }
}
