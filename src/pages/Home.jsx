import { Link } from "react-router-dom";

import {
  NativeAd,
  BannerAd,
  SmartLink
} from "../components/AdSlot";

export default function Home({ user }) {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">
            FOOTBALL • PREDICTIONS • LEAGUES
          </p>

          <h1>
            Predict football.
            <br />
            <span>Compete with friends.</span>
          </h1>

          <p>
            Follow fixtures, make predictions,
            climb leaderboards and create private
            football competitions with friends.
          </p>

          <div className="actions">
            <Link
              className="primary"
              to={user ? "/fixtures" : "/auth"}
            >
              {user
                ? "Start predicting"
                : "Get started"}
            </Link>

            <Link
              className="secondary"
              to="/leagues"
            >
              Explore leagues
            </Link>
          </div>
        </div>

        <div className="hero-ball">
          ⚽
        </div>
      </section>

      <NativeAd />

      <div className="feature-grid">
        <Link
          to="/fixtures"
          className="feature"
        >
          <b>📅 Fixtures</b>
          <span>
            View upcoming football matches
            and make predictions.
          </span>
        </Link>

        <Link
          to="/leagues"
          className="feature"
        >
          <b>🌍 Global leagues</b>
          <span>
            Explore competitions, standings
            and scorers.
          </span>
        </Link>

        <Link
          to="/private"
          className="feature"
        >
          <b>👥 Private leagues</b>
          <span>
            Compete privately with your friends.
          </span>
        </Link>

        <Link
          to="/terms"
          className="feature"
        >
          <b>📜 Terms & Privacy</b>
          <span>
            Read the rules and privacy information.
          </span>
        </Link>
      </div>

      <BannerAd />

      <SmartLink />
    </main>
  );
}
