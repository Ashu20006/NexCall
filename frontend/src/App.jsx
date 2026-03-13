import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Login, Signup } from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CallScreen from "./components/CallScreen.jsx";
import IncomingCall from "./components/IncomingCall.jsx";
import { useWebRTC } from "./hooks/useWebRTC.js";

const BACKEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : import.meta.env.VITE_BACKEND_URL || "";

/* ── axios base ── */
const api = axios.create({ baseURL: BACKEND_URL });

export default function App() {
  const [page, setPage] = useState("login"); // login | signup
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null); // { from, fromName, fromSocketId, offer }
  const [remoteName, setRemoteName] = useState("");

  const socketRef = useRef(null);

  /* ── WebRTC hook ── */
  const {
    callState, setCallState,
    localStream, remoteStream,
    isMuted, isVideoOff,
    initiateCall, acceptCall,
    onCallAnswered, onIceCandidate,
    cleanup: cleanupWebRTC,
    toggleMute, toggleVideo,
    remoteSocketIdRef,
  } = useWebRTC({
    socketRef,
    onCallEnd: useCallback(() => {
      setIncomingCall(null);
      setRemoteName("");
    }, []),
  });

  /* ── Auto-login from localStorage ── */
  useEffect(() => {
    const stored = localStorage.getItem("nexcall_user");
    const token = localStorage.getItem("nexcall_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  /* ── Socket setup ── */
  useEffect(() => {
    if (!user) return;

    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL, {
        transports: ["websocket"],
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    const socket = socketRef.current;

    const onConnect = () => socket.emit("join", { userId: user.id, userName: user.name });
    const onOnlineUsers = (users) => setOnlineUsers(users);
    const onIncomingCall = (data) => setIncomingCall(data);
    const onCallAnsweredEv = (data) => onCallAnswered(data);
    const onIceCandidateEv = (data) => onIceCandidate(data);
    const onCallRejected = () => { cleanupWebRTC(); setRemoteName(""); };
    const onCallEnded = () => { cleanupWebRTC(); setRemoteName(""); };
    const onCallUnavailable = () => {
      alert("That user is not online right now.");
      cleanupWebRTC();
      setRemoteName("");
    };

    socket.on("connect", onConnect);
    socket.on("online-users", onOnlineUsers);
    socket.on("incoming-call", onIncomingCall);
    socket.on("call-answered", onCallAnsweredEv);
    socket.on("ice-candidate", onIceCandidateEv);
    socket.on("call-rejected", onCallRejected);
    socket.on("call-ended", onCallEnded);
    socket.on("call-unavailable", onCallUnavailable);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("online-users", onOnlineUsers);
      socket.off("incoming-call", onIncomingCall);
      socket.off("call-answered", onCallAnsweredEv);
      socket.off("ice-candidate", onIceCandidateEv);
      socket.off("call-rejected", onCallRejected);
      socket.off("call-ended", onCallEnded);
      socket.off("call-unavailable", onCallUnavailable);
    };
  }, [user, onCallAnswered, onIceCandidate, cleanupWebRTC]);

  /* ── Auth handlers ── */
  const handleLogin = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    const { token, user: u } = res.data;
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("nexcall_token", token);
    localStorage.setItem("nexcall_user", JSON.stringify(u));
    setUser(u);
  };

  const handleSignup = async (name, email, password) => {
    const res = await api.post("/api/auth/register", { name, email, password });
    const { token, user: u } = res.data;
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("nexcall_token", token);
    localStorage.setItem("nexcall_user", JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    cleanupWebRTC();
    socketRef.current?.disconnect();
    socketRef.current = null;
    localStorage.removeItem("nexcall_user");
    localStorage.removeItem("nexcall_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setOnlineUsers([]);
    setIncomingCall(null);
    setRemoteName("");
  };

  /* ── Call actions ── */
  const callUser = async (targetId) => {
    if (!targetId || targetId === user.id) return;
    setRemoteName(targetId);
    try {
      await initiateCall(targetId, user);
    } catch (err) {
      alert("Could not access camera/microphone: " + err.message);
      cleanupWebRTC();
      setRemoteName("");
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    setRemoteName(incomingCall.fromName || incomingCall.from);
    try {
      await acceptCall(incomingCall);
      setIncomingCall(null);
    } catch (err) {
      alert("Could not access camera/microphone: " + err.message);
      cleanupWebRTC();
      setIncomingCall(null);
      setRemoteName("");
    }
  };

  const handleRejectCall = () => {
    socketRef.current?.emit("reject-call", { toSocketId: incomingCall?.fromSocketId });
    setIncomingCall(null);
    cleanupWebRTC();
  };

  const handleEndCall = () => {
    socketRef.current?.emit("end-call", {
      toSocketId: remoteSocketIdRef.current,
    });
    cleanupWebRTC();
    setRemoteName("");
  };

  /* ── Render ── */
  if (!user) {
    return page === "signup" ? (
      <Signup onSignup={handleSignup} goToLogin={() => setPage("login")} />
    ) : (
      <Login onLogin={handleLogin} goToSignup={() => setPage("signup")} />
    );
  }

  const inCall = callState === "calling" || callState === "in-call";

  return (
    <>
      <Dashboard
        user={user}
        onlineUsers={onlineUsers}
        callUser={callUser}
        onLogout={handleLogout}
      />

      {inCall && (
        <CallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
          remoteName={remoteName}
          callState={callState}
        />
      )}

      {incomingCall && !inCall && (
        <IncomingCall
          caller={incomingCall.fromName || incomingCall.from}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </>
  );
}
