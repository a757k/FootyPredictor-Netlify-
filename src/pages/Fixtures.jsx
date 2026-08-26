import { useEffect, useMemo, useState } from "react";

import { apiFootball } from "../lib/api";
import MatchCard from "../components/MatchCard";
import { supabase } from "../lib/supabaseClient";

const LEAGUES = [
  {
    id: 39,
    name: "Premier League",
  },
  {
    id: 140,
    name: "LaLiga",
  },
  {
    id: 2,
    name: "Champions League",
  },
];

function getSeason(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  // European football seasons normally begin in the
  // second half of the calendar year.
  if (month >= 7) {
    return year;
  }

  return year - 1;
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWeekKey(dateString) {
  const date = new Date(dateString);

  const start = new Date(date);
  const day = start.getDay();

  const difference = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + difference);
  start.setHours(0, 0, 0, 0);

  return start.toISOString().slice(0, 10);
}

function getWeekLabel(dateString) {
  const date = new Date(dateString);

  const start = new Date(date);
  const day = start.getDay();

  const difference = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + difference);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startText = start.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

  const endText = end.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

  return `${startText} – ${endText}`;
}

export default function Fixtures({ user }) {
  const [league, setLeague] = useState(39);

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [matches, setMatches] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState("upcoming");

  const [gameweek, setGameweek] = useState("all");

  async function loadFixtures() {
    setLoading(true);
    setError("");

    try {
      const selectedDate = new Date(date);

      let allMatches = [];

      /*
       * Upcoming mode:
       *
       * Instead of asking API-Football for only ONE date,
       * request the next several days.
       *
       * This prevents the page from appearing empty simply
       * because there are no games today.
       */
      if (viewMode === "upcoming") {
        const requests = [];

        for (let i = 0; i < 14; i += 1) {
          const currentDate = new Date(selectedDate);

          currentDate.setDate(
            currentDate.getDate() + i
          );

          const dateString =
            currentDate.toISOString().slice(0, 10);

          requests.push(
            apiFootball("fixtures", {
              league,
              season: getSeason(dateString),
              date: dateString,
            })
          );
        }

        const results = await Promise.all(requests);

        results.forEach((result) => {
          if (result?.response) {
            allMatches.push(...result.response);
          }
        });
      } else {
        /*
         * Gameweek mode:
         *
         * First find fixtures around the selected date.
         * The API's response includes the round/gameweek
         * information when available.
         */
        const requests = [];

        for (let i = -3; i <= 10; i += 1) {
          const currentDate = new Date(selectedDate);

          currentDate.setDate(
            currentDate.getDate() + i
          );

          const dateString =
            currentDate.toISOString().slice(0, 10);

          requests.push(
            apiFootball("fixtures", {
              league,
              season: getSeason(dateString),
              date: dateString,
            })
          );
        }

        const results = await Promise.all(requests);

        results.forEach((result) => {
          if (result?.response) {
            allMatches.push(...result.response);
          }
        });
      }

      /*
       * Remove duplicate matches.
       */
      const uniqueMatches = Array.from(
        new Map(
          allMatches.map((match) => [
            match.fixture?.id,
            match,
          ])
        ).values()
      );

      /*
       * Only show matches from the selected league.
       */
      const leagueMatches = uniqueMatches.filter(
        (match) =>
          Number(match.league?.id) === Number(league)
      );

      /*
       * Sort by actual kickoff time:
       *
       * closest → farthest
       */
      leagueMatches.sort((a, b) => {
        const first = new Date(
          a.fixture?.date || 0
        ).getTime();

        const second = new Date(
          b.fixture?.date || 0
        ).getTime();

        return first - second;
      });

      setMatches(leagueMatches);

      if (leagueMatches.length === 0) {
        setError(
          "No upcoming fixtures were found for this competition."
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load fixtures."
      );

      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixtures();
  }, [league, date, viewMode]);

  const availableGameweeks = useMemo(() => {
    const weeks = new Map();

    matches.forEach((match) => {
      const round =
        match.league?.round || "Unknown";

      if (!weeks.has(round)) {
        weeks.set(round, {
          round,
          matches: [],
        });
      }

      weeks.get(round).matches.push(match);
    });

    return Array.from(weeks.values());
  }, [matches]);

  const displayedMatches = useMemo(() => {
    if (gameweek === "all") {
      return matches;
    }

    return matches.filter(
      (match) =>
        match.league?.round === gameweek
    );
  }, [matches, gameweek]);

  const groupedMatches = useMemo(() => {
    const groups = new Map();

    displayedMatches.forEach((match) => {
      const kickoff = match.fixture?.date;

      if (!kickoff) {
        return;
      }

      const key = getWeekKey(kickoff);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: getWeekLabel(kickoff),
          matches: [],
        });
      }

      groups.get(key).matches.push(match);
    });

    return Array.from(groups.values()).sort(
      (a, b) =>
        new Date(a.key).getTime() -
        new Date(b.key).getTime()
    );
  }, [displayedMatches]);

  async function savePrediction(prediction) {
    if (!user) {
      alert(
        "Please sign in before making a prediction."
      );

      return;
    }

    const match = prediction.match;

    const homeTeamId =
      match.teams?.home?.id || null;

    const awayTeamId =
      match.teams?.away?.id || null;

    const {
      data: savedMatch,
      error: matchError,
    } = await supabase
      .from("matches")
      .upsert(
        {
          api_match_id:
            match.fixture.id,

          home_team:
            match.teams?.home?.name ||
            "Unknown",

          away_team:
            match.teams?.away?.name ||
            "Unknown",

          home_team_id:
            homeTeamId,

          away_team_id:
            awayTeamId,

          kickoff:
            match.fixture.date,

          status:
            match.fixture.status?.short ||
            "NS",
        },
        {
          onConflict:
            "api_match_id",
        }
      )
      .select()
      .single();

    if (matchError) {
      alert(matchError.message);
      return;
    }

    const {
      error: predictionError,
    } = await supabase
      .from("predictions")
      .upsert(
        {
          user_id: user.id,

          match_id:
            savedMatch.id,

          predicted_result:
            prediction.predicted_result,

          predicted_home_score:
            prediction.predicted_home_score,

          predicted_away_score:
            prediction.predicted_away_score,

          predicted_first_team:
            prediction.predicted_first_team,

          predicted_first_scorer:
            prediction.predicted_first_scorer,

          predicted_cards:
            prediction.predicted_cards,
        },
        {
          onConflict:
            "user_id,match_id",
        }
      );

    if (predictionError) {
      alert(
        predictionError.message
      );

      return;
    }

    alert(
      "Prediction saved successfully."
    );
  }

  return (
    <main>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            PREDICT
          </p>

          <h1>Fixtures</h1>

          <p>
            Upcoming matches are ordered from
            closest kickoff to farthest kickoff.
          </p>
        </div>

        <div className="filters">
          <select
            value={league}
            onChange={(e) => {
              setLeague(
                Number(e.target.value)
              );

              setGameweek("all");
            }}
          >
            {LEAGUES.map(
              (competition) => (
                <option
                  key={competition.id}
                  value={competition.id}
                >
                  {competition.name}
                </option>
              )
            )}
          </select>

          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setGameweek("all");
            }}
          />

          <select
            value={viewMode}
            onChange={(e) => {
              setViewMode(e.target.value);
              setGameweek("all");
            }}
          >
            <option value="upcoming">
              Upcoming fixtures
            </option>

            <option value="gameweek">
              Gameweeks
            </option>
          </select>

          {viewMode === "gameweek" && (
            <select
              value={gameweek}
              onChange={(e) =>
                setGameweek(e.target.value)
              }
            >
              <option value="all">
                All gameweeks
              </option>

              {availableGameweeks.map(
                (week) => (
                  <option
                    key={week.round}
                    value={week.round}
                  >
                    {week.round}
                  </option>
                )
              )}
            </select>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading">
          Loading upcoming fixtures...
        </div>
      )}

      {error && !loading && (
        <div className="error">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        displayedMatches.length === 0 && (
          <div className="empty">
            No fixtures were found.
          </div>
        )}

      {!loading &&
        !error &&
        displayedMatches.length > 0 && (
          <div className="match-list">
            {viewMode === "gameweek" &&
            gameweek === "all"
              ? groupedMatches.map(
                  (group) => (
                    <section
                      key={group.key}
                      className="fixture-week"
                    >
                      <div className="fixture-week-header">
                        <h2>
                          {group.label}
                        </h2>

                        <span>
                          {group.matches.length}{" "}
                          {group.matches.length ===
                          1
                            ? "match"
                            : "matches"}
                        </span>
                      </div>

                      {group.matches
                        .sort(
                          (a, b) =>
                            new Date(
                              a.fixture.date
                            ).getTime() -
                            new Date(
                              b.fixture.date
                            ).getTime()
                        )
                        .map(
                          (match) => (
                            <div
                              key={
                                match.fixture.id
                              }
                              className="fixture-item"
                            >
                              <div className="fixture-time">
                                <strong>
                                  {formatTime(
                                    match.fixture
                                      .date
                                  )}
                                </strong>

                                <span>
                                  {formatDate(
                                    match.fixture
                                      .date
                                  )}
                                </span>
                              </div>

                              <MatchCard
                                match={match}
                                onPredict={
                                  savePrediction
                                }
                              />
                            </div>
                          )
                        )}
                    </section>
                  )
                )
              : displayedMatches.map(
                  (match) => (
                    <div
                      key={
                        match.fixture.id
                      }
                      className="fixture-item"
                    >
                      <div className="fixture-time">
                        <strong>
                          {formatTime(
                            match.fixture.date
                          )}
                        </strong>

                        <span>
                          {formatDate(
                            match.fixture.date
                          )}
                        </span>
                      </div>

                      <MatchCard
                        match={match}
                        onPredict={
                          savePrediction
                        }
                      />
                    </div>
                  )
                )}
          </div>
        )}
    </main>
  );
}
