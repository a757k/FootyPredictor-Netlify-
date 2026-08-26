export default async (request) => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  const json = (body, status = 200, extraHeaders = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
    });

  if (!apiKey) {
    return json(
      {
        response: [],
        error:
          "FOOTBALL_DATA_API_KEY is not configured.",
      },
      500
    );
  }

  try {
    const url = new URL(request.url);

    const league =
      url.searchParams.get("league") || "39";

    const date =
      url.searchParams.get("date");

    const dateFrom =
      url.searchParams.get("dateFrom");

    const dateTo =
      url.searchParams.get("dateTo");

    const season =
      url.searchParams.get("season");

    const competitionMap = {
      "39": "PL",
      "140": "PD",
      "2": "CL",
    };

    const competition =
      competitionMap[String(league)];

    if (!competition) {
      return json(
        {
          response: [],
          error:
            "This competition is not currently supported by football-data.org.",
        },
        400
      );
    }

    const params = new URLSearchParams();

    /*
     * Support a date range.
     *
     * dateFrom/dateTo are preferred because the Fixtures
     * page can retrieve several days of fixtures with ONE
     * football-data.org request.
     */
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    /*
     * Keep compatibility with the old date parameter.
     */
    if (!dateFrom && !dateTo && date) {
      params.set("dateFrom", date);
      params.set("dateTo", date);
    }

    if (season) {
      const year = Number(season);

      if (Number.isInteger(year)) {
        params.set("season", String(year));
      }
    }

    const endpoint =
      `https://api.football-data.org/v4/competitions/${competition}/matches` +
      (params.toString()
        ? `?${params.toString()}`
        : "");

    const response = await fetch(endpoint, {
      headers: {
        "X-Auth-Token": apiKey,
        Accept: "application/json",
      },
    });

    const data = await response.json();

    /*
     * If football-data.org rate-limits us, return a clear
     * response instead of crashing the function.
     *
     * The Fixtures page will keep its cached fixtures.
     */
    if (!response.ok) {
      return json(
        {
          response: [],
          error:
            data?.message ||
            `football-data.org returned HTTP ${response.status}.`,
          rateLimited:
            response.status === 429,
        },
        response.status,
        {
          "Cache-Control":
            "no-store",
        }
      );
    }

    const matches = Array.isArray(data.matches)
      ? data.matches
      : [];

    const statusMap = {
      SCHEDULED: "NS",
      TIMED: "NS",
      IN_PLAY: "LIVE",
      PAUSED: "HT",
      FINISHED: "FT",
      POSTPONED: "PST",
      SUSPENDED: "SUSP",
      CANCELLED: "CANC",
    };

    const converted = matches.map((match) => {
      return {
        fixture: {
          id: match.id,
          date: match.utcDate,
          status: {
            short:
              statusMap[match.status] ||
              match.status ||
              "NS",
          },
        },

        league: {
          id: Number(league),
          name:
            match.competition?.name ||
            "Football",
          country:
            match.area?.name ||
            "",
          round:
            match.matchday
              ? `Gameweek ${match.matchday}`
              : "Upcoming",
        },

        teams: {
          home: {
            id:
              match.homeTeam?.id ||
              null,
            name:
              match.homeTeam?.name ||
              match.homeTeam?.shortName ||
              "Home",
            logo:
              match.homeTeam?.crest ||
              "",
          },

          away: {
            id:
              match.awayTeam?.id ||
              null,
            name:
              match.awayTeam?.name ||
              match.awayTeam?.shortName ||
              "Away",
            logo:
              match.awayTeam?.crest ||
              "",
          },
        },

        goals: {
          home:
            match.score?.fullTime?.home ??
            null,

          away:
            match.score?.fullTime?.away ??
            null,
        },

        score: {
          fulltime: {
            home:
              match.score?.fullTime?.home ??
              null,

            away:
              match.score?.fullTime?.away ??
              null,
          },
        },
      };
    });

    converted.sort((a, b) => {
      return (
        new Date(a.fixture.date).getTime() -
        new Date(b.fixture.date).getTime()
      );
    });

    return json(
      {
        response: converted,
        results: converted.length,
        source: "football-data.org",
      },
      200,
      {
        /*
         * Let the browser/CDN reuse a successful response
         * for 60 seconds.
         */
        "Cache-Control":
          "public, max-age=60, stale-while-revalidate=300",
      }
    );
  } catch (error) {
    return json(
      {
        response: [],
        error:
          error?.message ||
          "Unable to retrieve football fixtures.",
      },
      500,
      {
        "Cache-Control":
          "no-store",
      }
    );
  }
};
