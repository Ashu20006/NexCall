import { useRef, useState, useCallback } from "react";

const BACKEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : import.meta.env.VITE_BACKEND_URL || "";

async function fetchIceServers() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/ice-servers`);
    const data = await res.json();
    return data.iceServers;
  } catch {
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
    ];
  }
}

export function useWebRTC({ socketRef, onCallEnd }) {
  const peerRef = useRef(null);

  // Candidates received from remote before remoteDescription is set
  const pendingIncoming = useRef([]);

  // Candidates we generated before we knew the remote socket ID
  const pendingOutgoing = useRef([]);

  const remoteSocketIdRef = useRef(null);

  const [callState, setCallState] = useState("idle");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  /* ── helpers ── */
  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingIncoming.current = [];
    pendingOutgoing.current = [];
    remoteSocketIdRef.current = null;
  }, []);

  const stopLocalStream = useCallback((stream) => {
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // Flush outgoing candidates once we know the remote socket ID
  const flushOutgoing = useCallback((toSocketId) => {
    if (!pendingOutgoing.current.length) return;
    pendingOutgoing.current.forEach((candidate) => {
      socketRef.current?.emit("ice-candidate", { toSocketId, candidate });
    });
    pendingOutgoing.current = [];
  }, [socketRef]);

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
      if (!e.candidate) return;

      if (remoteSocketIdRef.current) {
        // We know the remote socket — send immediately
        socketRef.current?.emit("ice-candidate", {
          toSocketId: remoteSocketIdRef.current,
          candidate: e.candidate,
        });
      } else {
        // Don't know remote socket yet — buffer and send once we do
        pendingOutgoing.current.push(e.candidate);
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
    pendingIncoming.current = [];
    pendingOutgoing.current = [];
    remoteSocketIdRef.current = null;

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
    pendingIncoming.current = [];
    pendingOutgoing.current = [];

    // We know the caller's socket ID immediately
    remoteSocketIdRef.current = incomingCall.fromSocketId;
    setCallState("in-call");

    const stream = await getMedia();
    const pc = await buildPeer();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    await pc.setRemoteDescription(incomingCall.offer);

    // Flush any incoming candidates buffered before setRemoteDescription
    for (const c of pendingIncoming.current) {
      try { await pc.addIceCandidate(c); } catch {}
    }
    pendingIncoming.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit("answer-call", {
      toSocketId: incomingCall.fromSocketId,
      answer,
    });

    // Flush any outgoing candidates that fired before answer was sent
    // (remoteSocketIdRef is already set so this is a safety flush)
    flushOutgoing(incomingCall.fromSocketId);
  }, [getMedia, buildPeer, socketRef, flushOutgoing]);

  // Called when caller receives the answer
  const onCallAnswered = useCallback(async ({ answer, fromSocketId }) => {
    if (!peerRef.current) return;

    // Now we know the answerer's socket ID
    remoteSocketIdRef.current = fromSocketId;
    setCallState("in-call");

    await peerRef.current.setRemoteDescription(answer);

    // Flush incoming candidates buffered before we had remote description
    for (const c of pendingIncoming.current) {
      try { await peerRef.current.addIceCandidate(c); } catch {}
    }
    pendingIncoming.current = [];

    // Flush outgoing candidates that fired before we knew the answerer's socket
    flushOutgoing(fromSocketId);
  }, [flushOutgoing]);

  // Called when we receive a remote ICE candidate
  const onIceCandidate = useCallback(async ({ candidate }) => {
    if (!peerRef.current) return;

    if (peerRef.current.remoteDescription) {
      try { await peerRef.current.addIceCandidate(candidate); } catch {}
    } else {
      // Buffer until setRemoteDescription is called
      pendingIncoming.current.push(candidate);
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