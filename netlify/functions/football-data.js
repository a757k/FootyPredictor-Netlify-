const API_BASE =
  "https://api.football-data.org/v4";

export default async function handler(request) {
  try {
    const apiKey =
      process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "FOOTBALL_DATA_API_KEY is not configured."
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

    const incoming =
      new URL(request.url);

    const path =
      incoming.searchParams.get(
        "path"
      ) || "/competitions";

    const params =
      new URLSearchParams(
        incoming.searchParams
      );

    params.delete("path");

    const target =
      `${API_BASE}${path}` +
      (params.toString()
        ? `?${params.toString()}`
        : "");

    const response =
      await fetch(target, {
        headers: {
          "X-Auth-Token":
            apiKey
        }
      });

    const body =
      await response.text();

    return new Response(
      body,
      {
        status:
          response.status,

        headers: {
          "content-type":
            "application/json",

          "cache-control":
            "public, max-age=60"
        }
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
