const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

/* ── CORS ── */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(["http://localhost:5173", "http://localhost:4173"]);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (mobile, curl, etc.)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());

/* ── DB ── */
connectDB();

/* ── Routes ── */
app.use("/api/auth", require("./routes/authRoutes"));

app.get("/", (_, res) => res.send("NexCall backend is running ✓"));

/* ── ICE servers endpoint — returns free Metered TURN credentials ── */
app.get("/api/ice-servers", (_, res) => {
  // Using open/public STUN + Metered free TURN via env-injected credentials
  // Set METERED_API_KEY in your Render env vars to get dynamic credentials
  // Falls back to STUN-only if no key is set (still works on most networks)
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
  ];

  const key = process.env.METERED_API_KEY;
  const user = process.env.TURN_USERNAME;
  const cred = process.env.TURN_CREDENTIAL;

  if (user && cred) {
    servers.push(
      { urls: "turn:openrelay.metered.ca:80", username: user, credential: cred },
      { urls: "turn:openrelay.metered.ca:80?transport=tcp", username: user, credential: cred },
      { urls: "turn:openrelay.metered.ca:443", username: user, credential: cred },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: user, credential: cred }
    );
  }

  res.json({ iceServers: servers });
});

/* ── Socket.IO ── */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`Socket CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

/* ── Online user registry ── */
// userId → Set<socketId>
const userSockets = new Map();

const addSocket = (userId, socketId) => {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
};

const removeSocket = (userId, socketId) => {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) userSockets.delete(userId);
};

const getOnlineUsers = () => Array.from(userSockets.keys());

const resolveTargets = ({ to, toSocketId, excludeSocketId }) => {
  if (toSocketId) {
    return toSocketId === excludeSocketId ? [] : [toSocketId];
  }
  if (!to || !userSockets.has(to)) return [];
  return Array.from(userSockets.get(to)).filter((s) => s !== excludeSocketId);
};

io.on("connection", (socket) => {
  console.log(`[socket] connect  ${socket.id}`);

  /* JOIN */
  socket.on("join", ({ userId, userName }) => {
    if (!userId) return;

    if (socket.data.userId) removeSocket(socket.data.userId, socket.id);

    socket.data.userId = userId;
    socket.data.userName = userName || "Unknown";
    addSocket(userId, socket.id);

    console.log(`[socket] join  user=${userId}  socket=${socket.id}`);
    io.emit("online-users", getOnlineUsers());
  });

  /* CALL USER */
  socket.on("call-user", ({ to, toSocketId, from, fromName, offer } = {}) => {
    const targets = resolveTargets({ to, toSocketId, excludeSocketId: socket.id });
    if (!targets.length) return socket.emit("call-unavailable");

    targets.forEach((tid) => {
      io.to(tid).emit("incoming-call", {
        from,
        fromName: fromName || socket.data.userName,
        fromSocketId: socket.id,
        offer,
      });
    });
    console.log(`[socket] call-user  from=${from}  to=${to}  targets=${targets}`);
  });

  /* ANSWER */
  socket.on("answer-call", ({ toSocketId, answer } = {}) => {
    const targets = resolveTargets({ toSocketId, excludeSocketId: socket.id });
    targets.forEach((tid) => {
      io.to(tid).emit("call-answered", { answer, fromSocketId: socket.id });
    });
  });

  /* REJECT */
  socket.on("reject-call", ({ toSocketId } = {}) => {
    const targets = resolveTargets({ toSocketId, excludeSocketId: socket.id });
    targets.forEach((tid) => io.to(tid).emit("call-rejected"));
  });

  /* ICE CANDIDATE */
  socket.on("ice-candidate", ({ toSocketId, candidate } = {}) => {
    const targets = resolveTargets({ toSocketId, excludeSocketId: socket.id });
    targets.forEach((tid) => io.to(tid).emit("ice-candidate", { candidate, fromSocketId: socket.id }));
  });

  /* END CALL */
  socket.on("end-call", ({ toSocketId, to } = {}) => {
    const targets = resolveTargets({ to, toSocketId, excludeSocketId: socket.id });
    targets.forEach((tid) => io.to(tid).emit("call-ended"));
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    const uid = socket.data.userId;
    if (uid) removeSocket(uid, socket.id);
    console.log(`[socket] disconnect  ${socket.id}`);
    io.emit("online-users", getOnlineUsers());
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
