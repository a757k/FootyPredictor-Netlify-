import { Link } from "react-router-dom";

export default function Header({
  user,
  onSignOut
}) {
  return (
    <header className="header">
      <Link to="/" className="brand">
        <span>⚽</span>
        FootyPredictor
      </Link>

      <nav>
        <Link to="/">Home</Link>

        <Link to="/fixtures">
          Fixtures
        </Link>

        <Link to="/leagues">
          Leagues
        </Link>

        <Link to="/private">
          Private
        </Link>

        {user && (
          <Link to="/favorites">
            Favorites
          </Link>
        )}

        {user ? (
          <button
            className="ghost"
            onClick={onSignOut}
          >
            Sign out
          </button>
        ) : (
          <Link to="/auth">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
