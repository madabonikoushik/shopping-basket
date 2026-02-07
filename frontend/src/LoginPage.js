import React, { useState } from "react";
import { api, setAuthToken } from "./api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState("");

  const clean = (s) => (s || "").trim();

  const clearSession = () => {
    localStorage.removeItem("token");
    setAuthToken(null); // ✅ remove Authorization header from axios
  };

  const login = async (u, p) => {
    const res = await api.post("/users/login", {
      username: clean(u),
      password: clean(p),
    });
    return res.data.token;
  };

  const signup = async (u, p) => {
    await api.post("/users", {
      username: clean(u),
      password: clean(p),
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // ✅ IMPORTANT: always start fresh (prevents old-user token issue)
    clearSession();

    const u = clean(username);
    const p = clean(password);

    if (!u || !p) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        await signup(u, p);
      }

      const token = await login(u, p);

      // ✅ store + attach token for all next requests
      localStorage.setItem("token", token);
      setAuthToken(token);

      onLogin(token);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        (mode === "signup"
          ? "Signup failed (username may already exist)."
          : "Invalid username/password.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 16,
      fontFamily: "Inter, Arial, sans-serif",
      background: "linear-gradient(180deg,#f6f8ff,#ffffff)",
    },
    card: {
      width: "100%",
      maxWidth: 440,
      background: "#fff",
      border: "1px solid #eef2ff",
      borderRadius: 18,
      boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
      padding: 18,
    },
    head: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
    logo: {
      width: 46,
      height: 46,
      borderRadius: 14,
      background: "linear-gradient(135deg,#6366f1,#22c55e)",
      display: "grid",
      placeItems: "center",
      color: "#fff",
      fontWeight: 900,
      boxShadow: "0 10px 18px rgba(99,102,241,0.18)",
    },
    h1: { margin: 0, fontSize: 22, fontWeight: 900, color: "#111827" },
    sub: { margin: "4px 0 0 0", color: "#6b7280", fontSize: 13 },

    label: { fontSize: 12, fontWeight: 900, color: "#374151", marginBottom: 6 },
    input: {
      width: "100%",
      padding: 12,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      outline: "none",
      fontSize: 14,
    },

    row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },

    btn: {
      flex: 1,
      minWidth: 150,
      border: "1px solid #e5e7eb",
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 6px 16px rgba(17,24,39,0.06)",
    },
    btnPrimary: {
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      border: "none",
      color: "#fff",
    },
    btnSecondary: {
      background: "linear-gradient(135deg,#22c55e,#16a34a)",
      border: "none",
      color: "#fff",
    },
    disabled: { opacity: 0.65, cursor: "not-allowed" },

    error: {
      marginTop: 10,
      padding: 10,
      borderRadius: 12,
      background: "#fff5f5",
      border: "1px solid #fecaca",
      color: "#b91c1c",
      fontSize: 13,
      fontWeight: 700,
      lineHeight: 1.3,
    },

    note: {
      marginTop: 12,
      fontSize: 12,
      color: "#6b7280",
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      padding: 10,
      borderRadius: 12,
      lineHeight: 1.4,
    },
    pillRow: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" },
    pill: (active) => ({
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      border: "1px solid " + (active ? "#c7d2fe" : "#e5e7eb"),
      background: active ? "#eef2ff" : "#fff",
      color: active ? "#4338ca" : "#374151",
    }),
  };

  const isDisabled = loading || !clean(username) || !clean(password);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.head}>
          <div style={styles.logo}>SC</div>
          <div>
            <p style={styles.h1}>Welcome back</p>
            <p style={styles.sub}>
              {mode === "signup"
                ? "Create your account to continue"
                : "Login to continue"}
            </p>

            <div style={styles.pillRow}>
              <button
                type="button"
                onClick={() => {
                  clearSession(); // ✅ clear old token when switching
                  setMode("login");
                  setError("");
                }}
                style={styles.pill(mode === "login")}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  clearSession(); // ✅ clear old token when switching
                  setMode("signup");
                  setError("");
                }}
                style={styles.pill(mode === "signup")}
              >
                New user (Sign up)
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <div style={styles.label}>Username</div>
            <input
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={styles.label}>Password</div>
            <input
              placeholder="Enter password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
            Tip: avoid trailing spaces
          </div>

          <div style={styles.row}>
            <button
              type="submit"
              disabled={isDisabled}
              style={{
                ...styles.btn,
                ...(mode === "signup" ? styles.btnSecondary : styles.btnPrimary),
                ...(isDisabled ? styles.disabled : {}),
              }}
            >
              {loading
                ? "Please wait..."
                : mode === "signup"
                ? "Create account"
                : "Login"}
            </button>

            <button
              type="button"
              onClick={() => {
                clearSession(); // ✅ clear old token when toggling
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              disabled={loading}
              style={{
                ...styles.btn,
                ...(loading ? styles.disabled : {}),
              }}
            >
              {mode === "login" ? "New user?" : "Have account?"}
            </button>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}
        </form>

        <div style={styles.note}>
          Backend endpoints used: <b>POST /users</b> (signup) &nbsp;|&nbsp;{" "}
          <b>POST /users/login</b> (login)
        </div>
      </div>
    </div>
  );
}
