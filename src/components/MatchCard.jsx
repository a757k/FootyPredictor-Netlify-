import { useState } from "react";

export default function MatchCard({
  match,
  onPredict
}) {
  const homeName =
    match.teams?.home?.name ||
    match.home_team ||
    "Home";

  const awayName =
    match.teams?.away?.name ||
    match.away_team ||
    "Away";

  const [homeScore, setHomeScore] =
    useState(1);

  const [awayScore, setAwayScore] =
    useState(0);

  const [result, setResult] =
    useState("HOME");

  const [firstTeam, setFirstTeam] =
    useState("HOME");

  const [firstScorer, setFirstScorer] =
    useState("");

  const [cards, setCards] =
    useState("HOME");

  const kickoff = match.fixture?.date
    ? new Date(
        match.fixture.date
      ).toLocaleString()
    : match.kickoff
      ? new Date(
          match.kickoff
        ).toLocaleString()
      : "TBD";

  function submit() {
    onPredict({
      match,

      predicted_result: result,

      predicted_home_score:
        Number(homeScore),

      predicted_away_score:
        Number(awayScore),

      predicted_first_team:
        firstTeam,

      predicted_first_scorer:
        firstScorer,

      predicted_cards:
        cards
    });
  }

  return (
    <article className="match-card">
      <div className="match-top">
        <span>{kickoff}</span>

        <span>
          {match.league?.name || ""}
        </span>
      </div>

      <div className="teams">
        <b>{homeName}</b>

        <span>vs</span>

        <b>{awayName}</b>
      </div>

      <div className="prediction-grid">
        <label>
          Result

          <select
            value={result}
            onChange={(e) =>
              setResult(e.target.value)
            }
          >
            <option value="HOME">
              {homeName}
            </option>

            <option value="DRAW">
              Draw
            </option>

            <option value="AWAY">
              {awayName}
            </option>
          </select>
        </label>

        <label>
          Exact score

          <div className="score-input">
            <input
              type="number"
              min="0"
              max="30"
              value={homeScore}
              onChange={(e) =>
                setHomeScore(e.target.value)
              }
            />

            <span>:</span>

            <input
              type="number"
              min="0"
              max="30"
              value={awayScore}
              onChange={(e) =>
                setAwayScore(e.target.value)
              }
            />
          </div>
        </label>

        <label>
          First team to score

          <select
            value={firstTeam}
            onChange={(e) =>
              setFirstTeam(e.target.value)
            }
          >
            <option value="HOME">
              {homeName}
            </option>

            <option value="AWAY">
              {awayName}
            </option>

            <option value="NONE">
              No goal
            </option>
          </select>
        </label>

        <label>
          First goalscorer

          <input
            value={firstScorer}
            onChange={(e) =>
              setFirstScorer(e.target.value)
            }
            placeholder="Player"
          />
        </label>

        <label>
          More cards

          <select
            value={cards}
            onChange={(e) =>
              setCards(e.target.value)
            }
          >
            <option value="HOME">
              {homeName}
            </option>

            <option value="AWAY">
              {awayName}
            </option>

            <option value="SAME">
              Same
            </option>
          </select>
        </label>
      </div>

      <button
        className="primary"
        onClick={submit}
      >
        Save prediction
      </button>
    </article>
  );
}
