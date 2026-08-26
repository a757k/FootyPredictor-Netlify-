const API_BASE =
  "https://v3.football.api-sports.io";

export default async function handler(request) {
  try {
    const apiKey =
      process.env.API_FOOTBALL_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "API_FOOTBALL_KEY is not configured."
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

    const endpoint =
      incoming.searchParams.get(
        "endpoint"
      ) || "fixtures";

    const params =
      new URLSearchParams(
        incoming.searchParams
      );

    params.delete("endpoint");

    const target =
      `${API_BASE}/${endpoint}` +
      (params.toString()
        ? `?${params.toString()}`
        : "");

    const response =
      await fetch(target, {
        headers: {
          "x-apisports-key":
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
            "public, max-age=30"
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
