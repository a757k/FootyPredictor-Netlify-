export default async (request) => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "FOOTBALL_DATA_API_KEY is not configured.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const url = new URL(request.url);

    const league =
      url.searchParams.get("league") || "39";

    const date =
      url.searchParams.get("date");

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
      return new Response(
        JSON.stringify({
          response: [],
          error:
            "This competition is not currently supported by football-data.org.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const params = new URLSearchParams();

    if (date) {
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

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          response: [],
          error:
            data?.message ||
            `football-data.org returned HTTP ${response.status}.`,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const matches = Array.isArray(data.matches)
      ? data.matches
      : [];

    const converted = matches.map((match) => {
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

    return new Response(
      JSON.stringify({
        response: converted,
        results: converted.length,
        source: "football-data.org",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, max-age=60",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        response: [],
        error:
          error?.message ||
          "Unable to retrieve football fixtures.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
