import {
  useEffect,
  useState
} from "react";

import {
  apiFootball,
  footballData
} from "../lib/api";

const COMPETITIONS = [
  {
    id: 39,
    name: "Premier League",
    footballDataCode: "PL"
  },
  {
    id: 140,
    name: "LaLiga",
    footballDataCode: "PD"
  },
  {
    id: 2,
    name: "Champions League",
    footballDataCode: "CL"
  }
];

export default function Leagues() {
  const [selected, setSelected] =
    useState(COMPETITIONS[0]);

  const [standings, setStandings] =
    useState([]);

  const [scorers, setScorers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      /*
       * API-Football:
       * standings
       */

      const standingsResponse =
        await apiFootball(
          "standings",
          {
            league: selected.id,
            season:
              new Date().getFullYear()
          }
        );

      const rows =
        standingsResponse
          .response?.[0]
          ?.league
          ?.standings?.[0] || [];

      setStandings(rows);

      /*
       * football-data.org:
       * scorers
       */

      const scorerResponse =
        await footballData(
          `/competitions/${selected.footballDataCode}/scorers`,
          {
            limit: 10
          }
        );

      setScorers(
        scorerResponse.scorers || []
      );
    } catch (error) {
      setError(
        error.message ||
          "Unable to load league data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [selected]);

  return (
    <main>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            GLOBAL LEAGUES
          </p>

          <h1>
            Competitions
          </h1>
        </div>
      </div>

      <div className="league-tabs">
        {COMPETITIONS.map(
          (competition) => (
            <button
              key={competition.id}
              className={
                selected.id ===
                competition.id
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setSelected(
                  competition
                )
              }
            >
              {competition.name}
            </button>
          )
        )}
      </div>

      {loading && (
        <div className="loading">
          Loading league data...
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {!loading &&
        !error && (
          <div className="two-col">
            <section className="panel">
              <h2>
                Standings
              </h2>

              {standings.map(
                (row, index) => (
                  <div
                    className="table-row"
                    key={
                      row.team.id
                    }
                  >
                    <span>
                      {index + 1}
                    </span>

                    <b>
                      {row.team.name}
                    </b>

                    <span>
                      {row.points} pts
                    </span>

                    <span>
                      {row.all.played} P
                    </span>
                  </div>
                )
              )}
            </section>

            <section className="panel">
              <h2>
                Top scorers
              </h2>

              {scorers.map(
                (scorer, index) => (
                  <div
                    className="scorer"
                    key={index}
                  >
                    <span>
                      #{index + 1}
                    </span>

                    <b>
                      {
                        scorer
                          .player
                          ?.name
                      }
                    </b>

                    <span>
                      {scorer.goals}
                    </span>
                  </div>
                )
              )}
            </section>
          </div>
        )}
    </main>
  );
}
