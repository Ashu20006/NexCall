import { useState } from "react";
import "./Dashboard.css";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#6c63ff",
  "#3b82f6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

function avatarColor(str = "") {
  let hash = 0;
  for (const c of str) hash = c.charCodeAt(0) + (hash << 5) - hash;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Dashboard({ user, onlineUsers, callUser, onLogout }) {
  const [callTo, setCallTo] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCallById = (e) => {
    e.preventDefault();
    const id = callTo.trim();
    if (!id) return;
    callUser(id);
    setCallTo("");
  };

  const copyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const peers = Array.isArray(onlineUsers)
    ? onlineUsers.filter((u) =>
        typeof u === "string" ? u !== user.id : u.id !== user.id
      )
    : [];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-icon">⬡</span>
            <span className="brand-name">NexCall</span>
          </div>

          <div className="my-profile">
            <div
              className="avatar"
              style={{
                width: 48,
                height: 48,
                fontSize: 18,
                background: avatarColor(user.id),
                color: "#fff",
              }}
            >
              {getInitials(user.name)}
            </div>
            <div className="my-profile-info">
              <div className="my-name">{user.name}</div>
              <div className="my-status">
                <span className="status-dot" />
                Online
              </div>
            </div>
          </div>

          <div className="my-id-card">
            <div className="my-id-label">Your ID</div>
            <div className="my-id-row">
              <code className="my-id-value">{user.id}</code>
              <button className="copy-btn" onClick={copyId} title="Copy ID">
                {copied ? "✓" : "⎘"}
              </button>
            </div>
            <div className="my-id-hint">Share this ID so others can call you</div>
          </div>
        </div>

        <button className="btn btn-ghost logout-btn" onClick={onLogout}>
          ⎋ &nbsp;Sign out
        </button>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="main-header">
          <div>
            <h1 className="main-title">Good day, {user.name.split(" ")[0]} 👋</h1>
            <p className="main-subtitle">
              {peers.length} {peers.length === 1 ? "person" : "people"} online now
            </p>
          </div>
        </div>

        <div className="call-card">
          <div className="call-card-inner">
            <div className="call-card-icon">📞</div>
            <div className="call-card-body">
              <h3>Call by User ID</h3>
              <p>Paste a friend's ID to start a video call instantly</p>
              <form className="call-form" onSubmit={handleCallById}>
                <input
                  className="input"
                  placeholder="Paste User ID here…"
                  value={callTo}
                  onChange={(e) => setCallTo(e.target.value)}
                  autoComplete="off"
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!callTo.trim()}
                >
                  Call Now
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="online-section">
          <div className="section-header">
            <h2 className="section-title">Online Now</h2>
            <span className="online-badge">{peers.length}</span>
          </div>

          {peers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌐</div>
              <p>No one else is online right now.</p>
              <span>Share your ID with a friend to get started!</span>
            </div>
          ) : (
            <div className="users-grid">
              {peers.map((peer) => {
                const { id, name } =
                  typeof peer === "string" ? { id: peer, name: peer } : peer;

                return (
                  <div key={id} className="user-card">
                    <div className="user-card-top">
                      <div
                        className="avatar"
                        style={{
                          width: 52,
                          height: 52,
                          fontSize: 20,
                          background: avatarColor(id),
                          color: "#fff",
                        }}
                      >
                        {getInitials(name)}
                      </div>
                      <div className="user-online-dot" />
                    </div>

                    <div className="user-card-name">{name}</div>
                    <div className="user-card-id">{id}</div>

                    <button
                      className="btn btn-primary user-call-btn"
                      onClick={() => callUser(id)}
                    >
                      📹 Call
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}