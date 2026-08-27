import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const TABS = [
  {
    id: "global",
    label: "Global",
  },
  {
    id: "country",
    label: "Country",
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

  start.setHours(
    0,
    0,
    0,
    0
  );

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

export default function Rankings({
  user,
}) {
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
       * Get the signed-in user's country.
       */
      let userCountry = "";

      if (user) {
        const {
          data: profile,
          error:
            profileError,
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
      }

      /*
       * Determine the beginning
       * of the selected period.
       */
      const startDate =
        period === "week"
          ? getStartOfWeek()
          : getStartOfYear();

      /*
       * Get all point events
       * since the beginning
       * of the period.
       */
      const {
        data: events,
        error:
          eventsError,
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
       * Get profiles so we can
       * display usernames and
       * countries.
       */
      const {
        data: profiles,
        error:
          profilesError,
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
       * Add points together
       * for each user.
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
           * Country league:
           * only include users
           * from the same country.
           */
          if (
            type ===
              "country" &&
            userCountry &&
            profile?.country !==
              userCountry
          ) {
            return;
          }

          const current =
            totals.get(
              event.user_id
            ) || 0;

          totals.set(
            event.user_id,
            current +
              Number(
                event.points ||
                  0
              )
          );
        }
      );

      /*
       * Convert totals into
       * ranking objects.
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
            (a, b) =>
              b.points -
              a.points
          );

      setRankings(
        results
      );
    } catch (err) {
      console.error(
        err
      );

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
            Compete with
            players around
            the world or
            against players
            from your country.
          </p>
        </div>
      </div>

      <div className="filters">
        {TABS.map(
          (tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setType(
                  tab.id
                )
              }
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

        {PERIODS.map(
          (item) => (
            <button
              key={
                item.id
              }
              type="button"
              onClick={() =>
                setPeriod(
                  item.id
                )
              }
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
              🇶🇦{" "}
              <strong>
                {country}
              </strong>{" "}
              rankings
            </>
          ) : (
            <>
              Select your
              country in your
              profile to join
              a country league.
            </>
          )}
        </div>
      )}

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
            #{currentUserRank.rank}
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

      {loading && (
        <div className="loading">
          Loading rankings...
        </div>
      )}

      {error &&
        !loading && (
          <div className="error">
            {error}
          </div>
        )}

      {!loading &&
        !error &&
        rankings.length ===
          0 && (
          <div className="empty">
            No points have
            been earned during
            this period yet.
          </div>
        )}

      {!loading &&
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
