import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const TABS = [
  {
    id: "global",
    label: "Global League",
  },
  {
    id: "country",
    label: "Country League",
  },
];

const PERIODS = [
  {
    id: "week",
    label: "This Week",
  },
  {
    id: "year",
    label: "This Year",
  },
];

function getStartOfWeek() {
  const now = new Date();

  const day = now.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  const start = new Date(now);

  start.setDate(
    start.getDate() + difference
  );

  start.setHours(0, 0, 0, 0);

  return start.toISOString();
}

function getStartOfYear() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    0,
    1
  ).toISOString();
}

function getPeriodStart(period) {
  if (period === "week") {
    return getStartOfWeek();
  }

  return getStartOfYear();
}

export default function Rankings({ user }) {
  const [type, setType] =
    useState("global");

  const [period, setPeriod] =
    useState("week");

  const [rankings, setRankings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [country, setCountry] =
    useState("");

  async function loadRankings() {
    setLoading(true);
    setError("");

    try {
      /*
       * Get the signed-in user's
       * country.
       */
      let userCountry = "";

      if (user) {
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "country"
          )
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        userCountry =
          profile?.country ||
          "";

        setCountry(
          userCountry
        );
      } else {
        setCountry("");
      }

      /*
       * Find the beginning of
       * the selected ranking period.
       *
       * WEEK:
       * Monday → now
       *
       * YEAR:
       * January 1 → now
       *
       * This means the ranking
       * automatically resets when
       * a new week or year begins.
       */
      const startDate =
        getPeriodStart(
          period
        );

      /*
       * Get all point events
       * during the selected period.
       */
      const {
        data: events,
        error: eventsError,
      } = await supabase
        .from("point_events")
        .select(
          "user_id, points, created_at"
        )
        .gte(
          "created_at",
          startDate
        );

      if (eventsError) {
        throw eventsError;
      }

      /*
       * Get player profiles.
       */
      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          "id, display_name, avatar_url, country"
        );

      if (profilesError) {
        throw profilesError;
      }

      const profileMap =
        new Map(
          (profiles || []).map(
            (profile) => [
              profile.id,
              profile,
            ]
          )
        );

      /*
       * Add up each player's
       * points.
       */
      const totals =
        new Map();

      (events || []).forEach(
        (event) => {
          const profile =
            profileMap.get(
              event.user_id
            );

          /*
           * Country League:
           *
           * Only show players whose
           * country matches the
           * signed-in user's country.
           */
          if (
            type ===
              "country"
          ) {
            if (
              !userCountry
            ) {
              return;
            }

            if (
              profile?.country !==
              userCountry
            ) {
              return;
            }
          }

          const current =
            totals.get(
              event.user_id
            ) || 0;

          totals.set(
            event.user_id,
            current +
              Number(
                event.points || 0
              )
          );
        }
      );

      /*
       * Convert totals into
       * ranking players.
       */
      const results =
        Array.from(
          totals.entries()
        )
          .map(
            ([
              userId,
              points,
            ]) => {
              const profile =
                profileMap.get(
                  userId
                );

              return {
                userId,
                points,
                displayName:
                  profile
                    ?.display_name ||
                  "Player",
                avatarUrl:
                  profile
                    ?.avatar_url ||
                  "",
                country:
                  profile
                    ?.country ||
                  "",
              };
            }
          )
          .sort(
            (a, b) => {
              /*
               * Highest points first.
               *
               * If two players have
               * the same points, sort
               * alphabetically.
               */
              if (
                b.points !==
                a.points
              ) {
                return (
                  b.points -
                  a.points
                );
              }

              return a.displayName.localeCompare(
                b.displayName
              );
            }
          );

      setRankings(
        results
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load rankings."
      );

      setRankings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRankings();
  }, [
    type,
    period,
    user,
  ]);

  /*
   * Automatically refresh the
   * rankings every 60 seconds.
   */
  useEffect(() => {
    const timer =
      setInterval(
        () => {
          loadRankings();
        },
        60000
      );

    return () => {
      clearInterval(timer);
    };
  }, [
    type,
    period,
    user,
  ]);

  const currentUserRank =
    useMemo(() => {
      if (!user) {
        return null;
      }

      const index =
        rankings.findIndex(
          (player) =>
            player.userId ===
            user.id
        );

      if (index === -1) {
        return null;
      }

      return {
        rank: index + 1,
        ...rankings[index],
      };
    }, [
      rankings,
      user,
    ]);

  return (
    <main>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            COMPETE
          </p>

          <h1>
            Rankings
          </h1>

          <p>
            Compete globally or
            against players from
            your country.
          </p>
        </div>
      </div>

      {/* LEAGUE TYPE */}
      <div className="filters">
        {TABS.map(
          (tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setType(
                  tab.id
                );
              }}
              className={
                type ===
                tab.id
                  ? "active"
                  : ""
              }
            >
              {tab.label}
            </button>
          )
        )}

        {/* TIME PERIOD */}
        {PERIODS.map(
          (item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPeriod(
                  item.id
                );
              }}
              className={
                period ===
                item.id
                  ? "active"
                  : ""
              }
            >
              {item.label}
            </button>
          )
        )}
      </div>

      {/* COUNTRY INFORMATION */}
      {type ===
        "country" && (
        <div
          className="ranking-country"
          style={{
            marginBottom:
              "20px",
          }}
        >
          {country ? (
            <>
              🌍{" "}
              <strong>
                {country}
              </strong>{" "}
              League
            </>
          ) : (
            <>
              Select your country
              in your profile to
              join a Country
              League.
            </>
          )}
        </div>
      )}

      {/* CURRENT USER POSITION */}
      {currentUserRank && (
        <div
          className="ranking-your-position"
          style={{
            marginBottom:
              "20px",
          }}
        >
          Your position:{" "}
          <strong>
            #
            {
              currentUserRank.rank
            }
          </strong>{" "}
          —{" "}
          <strong>
            {
              currentUserRank.points
            }{" "}
            pts
          </strong>
        </div>
      )}

      {/* PERIOD DESCRIPTION */}
      <div
        style={{
          marginBottom:
            "20px",
          opacity: 0.65,
          fontSize:
            "0.9rem",
        }}
      >
        {period ===
        "week"
          ? "Weekly rankings reset every Monday."
          : "Yearly rankings reset every January 1."}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="loading">
          Loading rankings...
        </div>
      )}

      {/* ERROR */}
      {error &&
        !loading && (
          <div className="error">
            {error}
          </div>
        )}

      {/* NO COUNTRY */}
      {!loading &&
        !error &&
        type ===
          "country" &&
        !country && (
          <div className="empty">
            Set your country in
            your profile to join
            a Country League.
          </div>
        )}

      {/* NO RESULTS */}
      {!loading &&
        !error &&
        rankings.length ===
          0 &&
        !(
          type ===
            "country" &&
          !country
        ) && (
          <div className="empty">
            No points have been
            earned during this
            period yet.
          </div>
        )}

      {/* RANKINGS */}
      {!loading &&
        !error &&
        rankings.length >
          0 && (
          <div className="ranking-list">
            {rankings.map(
              (
                player,
                index
              ) => (
                <div
                  key={
                    player.userId
                  }
                  className="ranking-row"
                >
                  {/* POSITION */}
                  <div className="ranking-position">
                    {index ===
                    0
                      ? "🥇"
                      : index ===
                        1
                      ? "🥈"
                      : index ===
                        2
                      ? "🥉"
                      : `#${
                          index +
                          1
                        }`}
                  </div>

                  {/* PLAYER */}
                  <div className="ranking-player">
                    {player.avatarUrl ? (
                      <img
                        src={
                          player.avatarUrl
                        }
                        alt=""
                        width="40"
                        height="40"
                        style={{
                          borderRadius:
                            "50%",
                          objectFit:
                            "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width:
                            "40px",
                          height:
                            "40px",
                          borderRadius:
                            "50%",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          background:
                            "rgba(255,255,255,0.08)",
                        }}
                      >
                        👤
                      </div>
                    )}

                    <div>
                      <strong>
                        {
                          player.displayName
                        }
                      </strong>

                      {type ===
                        "global" &&
                        player.country && (
                          <small
                            style={{
                              display:
                                "block",
                              opacity:
                                0.6,
                            }}
                          >
                            {
                              player.country
                            }
                          </small>
                        )}
                    </div>
                  </div>

                  {/* POINTS */}
                  <div className="ranking-points">
                    <strong>
                      {
                        player.points
                      }
                    </strong>

                    <span>
                      pts
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
    </main>
  );
}
