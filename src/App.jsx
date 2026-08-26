import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import { supabase } from "./lib/supabaseClient";

import Header from "./components/Header";

import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Fixtures from "./pages/Fixtures";
import Leagues from "./pages/Leagues";
import PrivateLeagues from "./pages/PrivateLeagues";
import Favorites from "./pages/Favorites";
import Admin from "./pages/Admin";
import Terms from "./pages/Terms";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user || null);
        setLoading(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="app-loading">
        Loading FootyPredictor...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Header user={user} onSignOut={signOut} />

      <Routes>
        <Route
          path="/"
          element={<Home user={user} />}
        />

        <Route
          path="/auth"
          element={<Auth />}
        />

        <Route
          path="/fixtures"
          element={<Fixtures user={user} />}
        />

        <Route
          path="/leagues"
          element={<Leagues />}
        />

        <Route
          path="/private"
          element={<PrivateLeagues user={user} />}
        />

        <Route
          path="/favorites"
          element={<Favorites user={user} />}
        />

        <Route
          path="/admin"
          element={<Admin />}
        />

        <Route
          path="/terms"
          element={<Terms />}
        />

        <Route
          path="*"
          element={<Home user={user} />}
        />
      </Routes>

      <footer>
        <span>© 2026 FootyPredictor</span>
        <a href="/terms">Terms & Privacy</a>
      </footer>
    </BrowserRouter>
  );
}
