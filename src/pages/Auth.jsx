import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Auth() {
  const [mode, setMode] =
    useState("signin");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function submit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (mode === "signin") {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          throw error;
        }

        return;
      }

      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const { error: profileError } =
          await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              email,
              display_name: name
            });

        if (profileError) {
          console.warn(
            "Profile creation:",
            profileError
          );
        }
      }

      setMessage(
        "Account created. Check your email if email confirmation is enabled."
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    setMessage("");

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",

        options: {
          redirectTo: window.location.origin
        }
      });

    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="auth-page">
      <div className="panel">
        <h1>
          {mode === "signin"
            ? "Welcome back"
            : "Create your account"}
        </h1>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Display name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            minLength="8"
            required
          />

          <button
            className="primary"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : "Continue"}
          </button>
        </form>

        <button
          className="google"
          onClick={googleLogin}
        >
          Continue with Google
        </button>

        {message && (
          <p className="notice">
            {message}
          </p>
        )}

        <button
          className="link-button"
          onClick={() =>
            setMode(
              mode === "signin"
                ? "signup"
                : "signin"
            )
          }
        >
          {mode === "signin"
            ? "Create an account"
            : "I already have an account"}
        </button>
      </div>
    </div>
  );
}
