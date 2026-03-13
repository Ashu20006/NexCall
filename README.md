# NexCall 🎥

A production-ready peer-to-peer video calling app built with React, Node.js, Socket.io, and WebRTC.

## Features

- ✅ 1-to-1 video calling across different networks
- ✅ Mute / camera toggle during calls
- ✅ Online users list with live presence
- ✅ Call by User ID
- ✅ Incoming call screen with accept / decline
- ✅ Auto-reconnect on socket drop
- ✅ JWT auth with 7-day sessions
- ✅ Works on mobile browsers
- ✅ TURN server support (plug in your own key — free from Metered)

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
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (comma-separated if multiple) |
| `TURN_USERNAME` | *(optional)* Your Metered TURN username |
| `TURN_CREDENTIAL` | *(optional)* Your Metered TURN credential |

> **Getting free TURN credentials:** Sign up at [metered.ca](https://www.metered.ca/), create a free app, and copy the username/credential from the TURN credentials page.

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add **Environment Variable**:

| Key | Value |
|-----|-------|
| `VITE_BACKEND_URL` | `https://your-backend.onrender.com` |

4. Deploy ✓

---

## Why it works across different networks

- **STUN servers** (Google, public): used for most connections — discovers your public IP
- **TURN relay** (Metered free tier): fallback relay server when direct P2P is blocked by firewall/NAT
- **ICE candidate queuing**: candidates are buffered until remote description is set, preventing timing bugs
- **Socket ID routing**: ICE candidates use direct socket IDs (not user IDs) to avoid routing to wrong tab

---

## Same MongoDB Database

This app uses the same `User` schema as your original project (`name`, `email`, `password`). Point `MONGO_URI` to your existing Atlas cluster and it will work with your existing users.
