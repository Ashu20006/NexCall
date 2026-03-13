import { useRef, useState, useCallback } from "react";

const BACKEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : import.meta.env.VITE_BACKEND_URL || "";

// Fetch ICE servers from backend (includes free TURN if configured)
async function fetchIceServers() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/ice-servers`);
    const data = await res.json();
    return data.iceServers;
  } catch {
    // fallback to public STUN only
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }
}

export function useWebRTC({ socketRef, onCallEnd }) {
  const peerRef = useRef(null);
  const pendingCandidates = useRef([]);
  const remoteSocketIdRef = useRef(null);

  const [callState, setCallState] = useState("idle"); // idle | calling | in-call
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  /* ── helpers ── */
  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidates.current = [];
    remoteSocketIdRef.current = null;
  }, []);

  const stopLocalStream = useCallback((stream) => {
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const buildPeer = useCallback(async () => {
    const iceServers = await fetchIceServers();
    const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });
    peerRef.current = pc;

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && remoteSocketIdRef.current) {
        socketRef.current?.emit("ice-candidate", {
          toSocketId: remoteSocketIdRef.current,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        cleanup();
        onCallEnd?.();
      }
    };

    return pc;
  }, [socketRef, onCallEnd]);

  /* ── PUBLIC API ── */

  const initiateCall = useCallback(async (targetUserId, callerInfo) => {
    setCallState("calling");
    const stream = await getMedia();
    const pc = await buildPeer();

    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current?.emit("call-user", {
      to: targetUserId,
      from: callerInfo.id,
      fromName: callerInfo.name,
      offer,
    });
  }, [getMedia, buildPeer, socketRef]);

  const acceptCall = useCallback(async (incomingCall) => {
    remoteSocketIdRef.current = incomingCall.fromSocketId;
    setCallState("in-call");

    const stream = await getMedia();
    const pc = await buildPeer();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    await pc.setRemoteDescription(incomingCall.offer);

    // flush buffered candidates
    for (const c of pendingCandidates.current) {
      try { await pc.addIceCandidate(c); } catch {}
    }
    pendingCandidates.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit("answer-call", {
      toSocketId: incomingCall.fromSocketId,
      answer,
    });
  }, [getMedia, buildPeer, socketRef]);

  const onCallAnswered = useCallback(async ({ answer, fromSocketId }) => {
    if (!peerRef.current) return;
    remoteSocketIdRef.current = fromSocketId;
    setCallState("in-call");

    await peerRef.current.setRemoteDescription(answer);

    for (const c of pendingCandidates.current) {
      try { await peerRef.current.addIceCandidate(c); } catch {}
    }
    pendingCandidates.current = [];
  }, []);

  const onIceCandidate = useCallback(async ({ candidate }) => {
    if (!peerRef.current) return;
    if (peerRef.current.remoteDescription) {
      try { await peerRef.current.addIceCandidate(candidate); } catch {}
    } else {
      pendingCandidates.current.push(candidate);
    }
  }, []);

  const cleanup = useCallback(() => {
    setCallState("idle");
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    closePeer();
    setLocalStream((prev) => { stopLocalStream(prev); return null; });
  }, [closePeer, stopLocalStream]);

  const toggleMute = useCallback(() => {
    setLocalStream((stream) => {
      stream?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
      return stream;
    });
    setIsMuted((m) => !m);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    setLocalStream((stream) => {
      stream?.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
      return stream;
    });
    setIsVideoOff((v) => !v);
  }, [isVideoOff]);

  return {
    callState, setCallState,
    localStream, remoteStream,
    isMuted, isVideoOff,
    initiateCall, acceptCall,
    onCallAnswered, onIceCandidate,
    cleanup, toggleMute, toggleVideo,
    peerRef, remoteSocketIdRef,
  };
}
