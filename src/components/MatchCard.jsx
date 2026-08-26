import { useState } from "react";

export default function MatchCard({ match, onPredict }) {
  const homeName =
    match.teams?.home?.name ||
    match.home_team ||
    "Home";

  const awayName =
    match.teams?.away?.name ||
    match.away_team ||
    "Away";

  const homeLogo =
    match.teams?.home?.logo ||
    match.home_logo ||
    "";

  const awayLogo =
    match.teams?.away?.logo ||
    match.away_logo ||
    "";

  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);

  const [result, setResult] = useState("HOME");
  const [firstTeam, setFirstTeam] = useState("HOME");
  const [firstScorer, setFirstScorer] = useState("");
  const [cards, setCards] = useState("HOME");

  const kickoffDate =
    match.fixture?.date ||
    match.kickoff ||
    null;

  const kickoff = kickoffDate
    ? new Date(kickoffDate)
    : null;

  const dateText = kickoff
    ? kickoff.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "TBD";

  const timeText = kickoff
    ? kickoff.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBD";

  const competition =
    match.league?.name ||
    "Football";

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
        cards,
    });
  }

  return (
    <article className="match-card">
      {/* HEADER */}
      <div className="match-card-header">
        <div>
          <span className="match-competition">
            {competition}
          </span>

          <span className="match-date">
            {dateText}
          </span>
        </div>

        <div className="match-kickoff">
          <strong>{timeText}</strong>
          <span>Kickoff</span>
        </div>
      </div>

      {/* TEAMS */}
      <div className="match-teams">
        <div className="team">
          {homeLogo ? (
            <img
              src={homeLogo}
              alt={homeName}
              className="team-logo"
            />
          ) : (
            <div className="team-logo-placeholder">
              ⚽
            </div>
          )}

          <strong>{homeName}</strong>
        </div>

        <div className="versus">
          <span>VS</span>
        </div>

        <div className="team">
          {awayLogo ? (
            <img
              src={awayLogo}
              alt={awayName}
              className="team-logo"
            />
          ) : (
            <div className="team-logo-placeholder">
              ⚽
            </div>
          )}

          <strong>{awayName}</strong>
        </div>
      </div>

      {/* PREDICTION */}
      <div className="prediction-section">
        <div className="prediction-title">
          Your prediction
        </div>

        <div className="prediction-grid">
          <label>
            <span>Result</span>

            <select
              value={result}
              onChange={(e) =>
                setResult(e.target.value)
              }
            >
              <option value="HOME">
                {homeName} win
              </option>

              <option value="DRAW">
                Draw
              </option>

              <option value="AWAY">
                {awayName} win
              </option>
            </select>
          </label>

          <label>
            <span>Exact score</span>

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

              <b>:</b>

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
            <span>First team to score</span>

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
            <span>First goalscorer</span>

            <input
              value={firstScorer}
              onChange={(e) =>
                setFirstScorer(e.target.value)
              }
              placeholder="Enter player"
            />
          </label>

          <label>
            <span>More cards</span>

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
      </div>

      {/* SAVE */}
      <button
        className="primary match-save-button"
        onClick={submit}
      >
        Save prediction
      </button>
    </article>
  );
}
