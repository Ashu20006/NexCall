import { useState } from "react";
import "./Auth.css";

function getInitials(name) {
  return name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";
}

export function Login({ onLogin, goToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb1" />
        <div className="auth-orb auth-orb2" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">NexCall</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to continue your conversations</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <button className="auth-link" onClick={goToSignup}>Sign up</button>
        </p>
      </div>
    </div>
  );
}

export function Signup({ onSignup, goToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    setLoading(true);
    try {
      await onSignup(name, email, password);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb1" />
        <div className="auth-orb auth-orb2" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">NexCall</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Join NexCall and start calling instantly</p>

        {error && <div className="auth-error">{error}</div>}

        {name && (
          <div className="auth-preview">
            <div className="avatar" style={{ width: 48, height: 48, background: "var(--accent)", color: "#fff", fontSize: 18 }}>
              {getInitials(name)}
            </div>
            <span style={{ color: "var(--text2)", fontSize: 13 }}>Your profile preview</span>
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          <div className="auth-field">
            <label>Full Name</label>
            <input
              className="input"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button className="auth-link" onClick={goToLogin}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
