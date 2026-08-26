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

const CACHE_PREFIX = "footypredictor_fixtures_";
const RETRY_DELAY = 60000;

function getSeason(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

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

function getCacheKey(league, date) {
  return `${CACHE_PREFIX}${league}_${date}`;
}

function readCachedFixtures(league, dates) {
  const cached = [];

  dates.forEach((date) => {
    try {
      const raw = localStorage.getItem(
        getCacheKey(league, date)
      );

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed?.response)) {
        cached.push(...parsed.response);
      }
    } catch {
      // Ignore damaged cache entries.
    }
  });

  return cached;
}

function saveCachedFixtures(league, date, response) {
  try {
    localStorage.setItem(
      getCacheKey(league, date),
      JSON.stringify({
        savedAt: Date.now(),
        response,
      })
    );
  } catch {
    // Ignore storage errors.
  }
}

function uniqueMatches(matches) {
  return Array.from(
    new Map(
      matches
        .filter((match) => match?.fixture?.id)
        .map((match) => [
          match.fixture.id,
          match,
        ])
    ).values()
  );
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const first = new Date(
      a.fixture?.date || 0
    ).getTime();

    const second = new Date(
      b.fixture?.date || 0
    ).getTime();

    return first - second;
  });
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

  const [lastUpdated, setLastUpdated] = useState(null);

  function getDatesToLoad() {
    const selectedDate = new Date(date);
    const dates = [];

    /*
     * We still support a 14-day upcoming window,
     * but cached dates are never requested again
     * unless they are missing.
     */
    const startOffset =
      viewMode === "upcoming" ? 0 : -3;

    const endOffset =
      viewMode === "upcoming" ? 13 : 10;

    for (
      let i = startOffset;
      i <= endOffset;
      i += 1
    ) {
      const currentDate = new Date(
        selectedDate
      );

      currentDate.setDate(
        currentDate.getDate() + i
      );

      dates.push(
        currentDate.toISOString().slice(0, 10)
      );
    }

    return dates;
  }

  async function loadFixtures({
    background = false,
  } = {}) {
    const dates = getDatesToLoad();

    /*
     * ALWAYS show cached fixtures first.
     *
     * This is especially important for an installed PWA.
     */
    const cachedMatches = readCachedFixtures(
      league,
      dates
    );

    const cachedForLeague = sortMatches(
      uniqueMatches(
        cachedMatches.filter(
          (match) =>
            Number(match.league?.id) ===
            Number(league)
        )
      )
    );

    if (cachedForLeague.length > 0) {
      setMatches(cachedForLeague);
      setError("");
      setLoading(false);
    } else if (!background) {
      setLoading(true);
      setError("");
    }

    /*
     * Only request dates that aren't already cached.
     *
     * This dramatically reduces repeat API calls.
     */
    const datesToRequest = dates.filter((dateString) => {
      try {
        return !localStorage.getItem(
          getCacheKey(
            league,
            dateString
          )
        );
      } catch {
        return true;
      }
    });

    /*
     * If everything is cached, don't hit the API.
     */
    if (datesToRequest.length === 0) {
      if (cachedForLeague.length > 0) {
        setLastUpdated(Date.now());
      }

      setLoading(false);
      return;
    }

    let successfulRequest = false;
    let failedRequest = false;

    /*
     * Request dates one at a time rather than firing
     * 14 requests simultaneously.
     *
     * This helps prevent rate limiting.
     */
    for (const dateString of datesToRequest) {
      try {
        const result = await apiFootball(
          "fixtures",
          {
            league,
            season: getSeason(dateString),
            date: dateString,
          }
        );

        if (
          result &&
          Array.isArray(result.response)
        ) {
          saveCachedFixtures(
            league,
            dateString,
            result.response
          );

          successfulRequest = true;

          /*
           * Immediately update the screen when
           * new fixtures arrive.
           */
          const allCached =
            readCachedFixtures(
              league,
              dates
            );

          const updatedMatches =
            sortMatches(
              uniqueMatches(
                allCached.filter(
                  (match) =>
                    Number(
                      match.league?.id
                    ) === Number(league)
                )
              )
            );

          setMatches(updatedMatches);

          if (updatedMatches.length > 0) {
            setError("");
          }

          setLastUpdated(Date.now());
        } else {
          failedRequest = true;
        }
      } catch (err) {
        failedRequest = true;

        /*
         * IMPORTANT:
         * Do NOT delete the existing fixtures.
         *
         * The user can continue seeing cached data.
         */
      }
    }

    /*
     * If we had cached fixtures, keep showing them even
     * if some/all API requests failed.
     */
    const finalCachedMatches =
      sortMatches(
        uniqueMatches(
          readCachedFixtures(
            league,
            dates
          ).filter(
            (match) =>
              Number(match.league?.id) ===
              Number(league)
          )
        )
      );

    if (finalCachedMatches.length > 0) {
      setMatches(finalCachedMatches);
      setError("");

      if (
        successfulRequest ||
        failedRequest
      ) {
        setLastUpdated(Date.now());
      }
    } else if (failedRequest) {
      setError(
        "Fixtures are temporarily unavailable. They will retry automatically."
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      if (cancelled) {
        return;
      }

      await loadFixtures();
    }

    initialLoad();

    /*
     * Automatically retry every 60 seconds.
     *
     * This means the PWA doesn't need a refresh button.
     */
    const retryTimer = setInterval(() => {
      if (!cancelled) {
        loadFixtures({
          background: true,
        });
      }
    }, RETRY_DELAY);

    return () => {
      cancelled = true;
      clearInterval(retryTimer);
    };
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

    return Array.from(
      weeks.values()
    );
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
      const kickoff =
        match.fixture?.date;

      if (!kickoff) {
        return;
      }

      const key =
        getWeekKey(kickoff);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label:
            getWeekLabel(kickoff),
          matches: [],
        });
      }

      groups.get(key).matches.push(match);
    });

    return Array.from(
      groups.values()
    ).sort(
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
                setGameweek(
                  e.target.value
                )
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

      {loading && matches.length === 0 && (
        <div className="loading">
          Loading upcoming fixtures...
        </div>
      )}

      {error &&
        !loading &&
        matches.length === 0 && (
          <div className="error">
            {error}
          </div>
        )}

      {!loading &&
        matches.length === 0 &&
        !error && (
          <div className="empty">
            No fixtures were found.
          </div>
        )}

      {matches.length > 0 && (
        <>
          <div
            style={{
              fontSize: "0.85rem",
              opacity: 0.65,
              marginBottom: "12px",
            }}
          >
            Fixtures update automatically.
          </div>

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
                          {
                            group.matches
                              .length
                          }{" "}
                          {group.matches
                            .length === 1
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
                                match
                                  .fixture
                                  .id
                              }
                              className="fixture-item"
                            >
                              <div className="fixture-time">
                                <strong>
                                  {formatTime(
                                    match
                                      .fixture
                                      .date
                                  )}
                                </strong>

                                <span>
                                  {formatDate(
                                    match
                                      .fixture
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
        </>
      )}
    </main>
  );
}
