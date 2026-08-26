import {
  useEffect,
  useState
} from "react";

import { supabase } from "../lib/supabaseClient";

const AVAILABLE_COMPETITIONS = [
  {
    id: "premier_league",
    label: "Premier League"
  },
  {
    id: "laliga",
    label: "LaLiga"
  },
  {
    id: "champions_league",
    label: "Champions League"
  }
];

export default function PrivateLeagues({
  user
}) {
  const [name, setName] =
    useState("");

  const [
    competitions,
    setCompetitions
  ] = useState([
    "premier_league"
  ]);

  const [joinCode, setJoinCode] =
    useState("");

  const [myLeagues, setMyLeagues] =
    useState([]);

  const [message, setMessage] =
    useState("");

  async function loadLeagues() {
    if (!user) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from("private_leagues")
      .select("*")
      .eq("owner_id", user.id)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (!error) {
      setMyLeagues(data || []);
    }
  }

  useEffect(() => {
    loadLeagues();
  }, [user]);

  function toggleCompetition(id) {
    setCompetitions((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      return [...current, id];
    });
  }

  async function createLeague() {
    if (!user) {
      setMessage(
        "Sign in first."
      );
      return;
    }

    if (!name.trim()) {
      setMessage(
        "Enter a league name."
      );
      return;
    }

    if (competitions.length === 0) {
      setMessage(
        "Choose at least one competition."
      );
      return;
    }

    const code =
      Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase();

    const {
      data,
      error
    } = await supabase
      .from("private_leagues")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        invite_code: code,
        competitions
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      `League created. Invite code: ${data.invite_code}`
    );

    setName("");

    await loadLeagues();
  }

  async function joinLeague() {
    if (!user) {
      setMessage(
        "Sign in first."
      );
      return;
    }

    const code =
      joinCode
        .trim()
        .toUpperCase();

    if (!code) {
      return;
    }

    const {
      data: league,
      error
    } = await supabase
      .from("private_leagues")
      .select("*")
      .eq("invite_code", code)
      .maybeSingle();

    if (error || !league) {
      setMessage(
        "League not found."
      );
      return;
    }

    const {
      error: joinError
    } = await supabase
      .from("private_league_members")
      .upsert(
        {
          private_league_id:
            league.id,

          user_id:
            user.id
        },
        {
          onConflict:
            "private_league_id,user_id"
        }
      );

    if (joinError) {
      setMessage(
        joinError.message
      );
      return;
    }

    setMessage(
      `You joined ${league.name}.`
    );

    setJoinCode("");
  }

  return (
    <main>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            COMPETE WITH FRIENDS
          </p>

          <h1>
            Private leagues
          </h1>
        </div>
      </div>

      {!user && (
        <div className="notice">
          Sign in to create or join
          private leagues.
        </div>
      )}

      {user && (
        <div className="two-col">
          <section className="panel">
            <h2>
              Create a league
            </h2>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="League name"
            />

            <h3>
              Competitions
            </h3>

            {AVAILABLE_COMPETITIONS.map(
              (competition) => (
                <label
                  key={competition.id}
                  style={{
                    display: "block",
                    marginBottom: 10
                  }}
                >
                  <input
                    type="checkbox"
                    checked={competitions.includes(
                      competition.id
                    )}
                    onChange={() =>
                      toggleCompetition(
                        competition.id
                      )
                    }
                    style={{
                      width: "auto",
                      marginRight: 8
                    }}
                  />

                  {competition.label}
                </label>
              )
            )}

            <button
              className="primary"
              onClick={createLeague}
            >
              Create league
            </button>
          </section>

          <section className="panel">
            <h2>
              Join a league
            </h2>

            <input
              value={joinCode}
              onChange={(e) =>
                setJoinCode(
                  e.target.value
                )
              }
              placeholder="Invite code"
            />

            <button
              className="primary"
              onClick={joinLeague}
            >
              Join
            </button>
          </section>
        </div>
      )}

      {message && (
        <div className="notice">
          {message}
        </div>
      )}

      {user && (
        <div className="panel"
          style={{
            maxWidth: 1200,
            margin: "20px auto"
          }}
        >
          <h2>
            Your leagues
          </h2>

          {myLeagues.length === 0 && (
            <p className="muted">
              You haven't created
              any leagues yet.
            </p>
          )}

          {myLeagues.map(
            (league) => (
              <div
                className="league-row"
                key={league.id}
              >
                <b>
                  {league.name}
                </b>

                <span>
                  {(league.competitions ||
                    [])
                    .map(
                      (id) =>
                        AVAILABLE_COMPETITIONS.find(
                          (c) =>
                            c.id === id
                        )?.label
                    )
                    .filter(Boolean)
                    .join(", ")}
                </span>

                <code>
                  {league.invite_code}
                </code>
              </div>
            )
          )}
        </div>
      )}
    </main>
  );
}
