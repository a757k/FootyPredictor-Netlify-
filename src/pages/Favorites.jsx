import {
  useEffect,
  useState
} from "react";

import { supabase } from "../lib/supabaseClient";

export default function Favorites({
  user
}) {
  const [favorites, setFavorites] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }

      const {
        data,
        error
      } = await supabase
        .from("favorites")
        .select("*")
        .eq(
          "user_id",
          user.id
        );

      if (!error) {
        setFavorites(data || []);
      }

      setLoading(false);
    }

    load();
  }, [user]);

  return (
    <main>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            YOUR TEAMS
          </p>

          <h1>
            Favorites
          </h1>
        </div>
      </div>

      {!user && (
        <div className="notice">
          Sign in to use favorites.
        </div>
      )}

      {user && loading && (
        <div className="loading">
          Loading favorites...
        </div>
      )}

      {user &&
        !loading &&
        favorites.length === 0 && (
          <div className="empty">
            No favorite teams yet.
          </div>
        )}

      {favorites.length > 0 && (
        <div className="feature-grid">
          {favorites.map(
            (favorite) => (
              <div
                className="feature"
                key={favorite.team_id}
              >
                ⭐{" "}
                <b>
                  {favorite.team_name}
                </b>
              </div>
            )
          )}
        </div>
      )}
    </main>
  );
}
