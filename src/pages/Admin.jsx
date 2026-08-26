import {
  useState
} from "react";

export default function Admin() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [token, setToken] =
    useState(
      localStorage.getItem(
        "fp_admin_token"
      ) || ""
    );

  const [message, setMessage] =
    useState("");

  async function login(event) {
    event.preventDefault();

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json"
            },

            body: JSON.stringify({
              email,
              password
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            "Admin login failed."
        );

        return;
      }

      localStorage.setItem(
        "fp_admin_token",
        data.token
      );

      setToken(data.token);

      setMessage(
        "Admin authentication successful."
      );
    } catch (error) {
      setMessage(
        error.message
      );
    }
  }

  async function verify() {
    try {
      const response =
        await fetch(
          "/api/admin/",
          {
            headers: {
              authorization:
                `Bearer ${token}`
            }
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        localStorage.removeItem(
          "fp_admin_token"
        );

        setToken("");

        setMessage(
          "Admin session expired."
        );

        return;
      }

      setMessage(
        `Authenticated as ${data.email}.`
      );
    } catch (error) {
      setMessage(
        error.message
      );
    }
  }

  function logout() {
    localStorage.removeItem(
      "fp_admin_token"
    );

    setToken("");

    setMessage("");
  }

  if (!token) {
    return (
      <main>
        <div className="auth-page">
          <div className="panel">
            <h1>
              Admin
            </h1>

            <form
              onSubmit={login}
            >
              <input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                required
              />

              <input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
              />

              <button className="primary">
                Sign in
              </button>
            </form>

            {message && (
              <p className="notice">
                {message}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            RESTRICTED
          </p>

          <h1>
            Admin dashboard
          </h1>
        </div>

        <button
          className="secondary"
          onClick={logout}
        >
          Sign out
        </button>
      </div>

      <div
        className="panel"
        style={{
          maxWidth: 1200,
          margin: "20px auto"
        }}
      >
        <h2>
          Administration
        </h2>

        <p>
          The administrator account is
          protected by a server-side
          credential check.
        </p>

        <p>
          User authentication passwords
          are intentionally never exposed.
          Supabase authentication does not
          provide administrators with users'
          plaintext passwords.
        </p>

        <button
          className="primary"
          onClick={verify}
        >
          Verify admin session
        </button>

        {message && (
          <p className="notice">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
