# NexCall 🎥

A production-ready peer-to-peer video calling app built with React, Node.js, Socket.io, and WebRTC.

🌐 **Live Demo:** [nex-call-plum.vercel.app](https://nex-call-plum.vercel.app)

---

## Features

- ✅ 1-to-1 video calling across different networks
- ✅ Works across strict NAT / mobile data (CGNAT) via TURN relay
- ✅ Mute / camera toggle during calls (with proper track enable/disable)
- ✅ Online users list with real names and live presence
- ✅ Call by User ID
- ✅ Incoming call screen with accept / decline
- ✅ Auto-reconnect on socket drop
- ✅ JWT auth with 7-day sessions
- ✅ Works on mobile browsers (Chrome, Safari)
- ✅ ICE candidate buffering — no dropped candidates due to timing

---

## Project Structure

```
nexcall/
├── backend/
│   ├── config/db.js
│   ├── controller/authController.js
│   ├── middleware/authMiddleware.js
│   ├── model/User.js
│   ├── routes/authRoutes.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/   CallScreen, IncomingCall
    │   ├── hooks/        useWebRTC.js
    │   ├── pages/        Auth, Dashboard
    │   ├── styles/       globals.css
    │   └── App.jsx
    ├── .env.example
    └── package.json
```

---

## Local Development

### 1. Backend
```bash
cd backend
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET in .env
npm install
npm run dev
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env.local
# Set VITE_BACKEND_URL=http://localhost:5000
npm install
npm run dev
```

---

## Deploy to Production

### Backend → Render

1. Push your code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Root Directory** to `backend`
4. Set **Start Command** to `npm start`
5. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Any long random string |

> **Important:** Do NOT add `dns.setServers()` to server.js — it crashes Node on Render. TURN credentials are hardcoded directly in the `/api/ice-servers` route.

> **MongoDB Atlas:** Make sure Network Access is set to `0.0.0.0/0` (allow from anywhere) so Render's dynamic IPs can connect.

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add **Environment Variable**:

| Key | Value |
|-----|-------|
| `VITE_BACKEND_URL` | `https://your-backend.onrender.com` *(no trailing slash)* |

4. Deploy ✓

---

## TURN Server Setup

NexCall uses [Metered.ca](https://www.metered.ca/) for free TURN relay. TURN is required for calls between devices on mobile data (4G/5G) and home WiFi due to carrier-grade NAT (CGNAT).

**Getting free TURN credentials:**
1. Sign up at [dashboard.metered.ca](https://dashboard.metered.ca/signup) — no credit card needed
2. Create a new app (e.g. `nexcall`)
3. Go to **TURN Server → TURN Credentials**
4. Click **Add Credential**
5. Copy the username and password
6. Hardcode them in `backend/server.js` inside the `/api/ice-servers` route (see the existing format)

The free tier gives 500MB/month of relayed traffic which is plenty for personal use.

---

## How it Works Across Different Networks

| Scenario | Connection Type | Works? |
|----------|----------------|--------|
| Same WiFi | Direct P2P via STUN | ✅ |
| Different home WiFi networks | P2P with STUN hole-punch | ✅ |
| Laptop (WiFi) → Phone (4G) | TURN relay | ✅ |
| Phone (4G) → Laptop (WiFi) | TURN relay | ✅ |

- **STUN** — Discovers your public IP. Works when at least one side has an open NAT.
- **TURN** — Relays traffic through a server. Required when both sides are behind strict NAT (e.g. mobile 4G uses carrier-grade NAT).
- **ICE candidate buffering** — Outgoing candidates are queued until the remote socket ID is known; incoming candidates are queued until `setRemoteDescription` is called. Prevents silent drops.

---

## Key Bugs Fixed

| Bug | Cause | Fix |
|-----|-------|-----|
| Phone→Laptop calls fail across networks | Outgoing ICE candidates dropped before remote socket ID was known | Buffer in `pendingOutgoing`, flush on `onCallAnswered` |
| Stop Video then Start Video shows black locally | `<video>` element removed from DOM when off, losing `srcObject` | Keep `<video>` always mounted, toggle `display:none` via CSS |
| Online users showing ID instead of name | Server only emitted user IDs, not names | Server now emits `{ id, name }` objects |
| 502 on Render | `dns.setServers()` at top of server.js crashed Node | Removed those lines |
| CORS errors on Vercel | `ALLOWED_ORIGINS` env var not parsing on Render | Replaced with `origin: true` |

---

## Same MongoDB Database

This app uses the same `User` schema as the original project (`name`, `email`, `password`). Point `MONGO_URI` to your existing Atlas cluster and it will work with your existing users.