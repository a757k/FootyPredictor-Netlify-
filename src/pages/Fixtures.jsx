import {
  useEffect,
  useState
} from "react";

import { apiFootball } from "../lib/api";
import MatchCard from "../components/MatchCard";
import { supabase } from "../lib/supabaseClient";

const LEAGUES = [
  {
    id: 39,
    name: "Premier League"
  },
  {
    id: 140,
    name: "LaLiga"
  },
  {
    id: 2,
    name: "Champions League"
  }
];

function getSeason(date) {
  const year =
    new Date(date).getFullYear();

  return year;
}

export default function Fixtures({
  user
}) {
  const [league, setLeague] =
    useState(39);

  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [matches, setMatches] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadFixtures() {
    setLoading(true);
    setError("");

    try {
      const data =
        await apiFootball(
          "fixtures",
          {
            league,
            season: getSeason(date),
            date
          }
        );

      setMatches(
        data.response || []
      );
    } catch (error) {
      setError(
        error.message ||
          "Unable to load fixtures."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixtures();
  }, [league, date]);

  async function savePrediction(prediction) {
    if (!user) {
      alert(
        "Please sign in before making a prediction."
      );

      return;
    }

    const match =
      prediction.match;

    const homeTeamId =
      match.teams?.home?.id || null;

    const awayTeamId =
      match.teams?.away?.id || null;

    const {
      data: savedMatch,
      error: matchError
    } = await supabase
      .from("matches")
      .upsert(
        {
          api_match_id:
            match.fixture.id,

          home_team:
            match.teams.home.name,

          away_team:
            match.teams.away.name,

          home_team_id:
            homeTeamId,

          away_team_id:
            awayTeamId,

          kickoff:
            match.fixture.date,

          status:
            match.fixture.status.short
        },
        {
          onConflict:
            "api_match_id"
        }
      )
      .select()
      .single();

    if (matchError) {
      alert(matchError.message);
      return;
    }

    const {
      error: predictionError
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
            prediction.predicted_cards
        },
        {
          onConflict:
            "user_id,match_id"
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
        </div>

        <div className="filters">
          <select
            value={league}
            onChange={(e) =>
              setLeague(
                Number(e.target.value)
              )
            }
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
            onChange={(e) =>
              setDate(e.target.value)
            }
          />
        </div>
      </div>

      {loading && (
        <div className="loading">
          Loading fixtures...
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        matches.length === 0 && (
          <div className="empty">
            No fixtures were returned
            for this date.
          </div>
        )}

      {!loading &&
        !error &&
        matches.length > 0 && (
          <div className="match-list">
            {matches.map((match) => (
              <MatchCard
                key={match.fixture.id}
                match={match}
                onPredict={
                  savePrediction
                }
              />
            ))}
          </div>
        )}
    </main>
  );
}
