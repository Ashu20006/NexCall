import { useEffect, useRef } from "react";
import "./CallScreen.css";

export default function CallScreen({
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  remoteName,
  callState,
}) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isCalling = callState === "calling";

  return (
    <div className="call-screen">
      {/* Remote video (big) */}
      <div className="remote-area">
        {remoteStream ? (
          <video
            ref={remoteRef}
            className="remote-video"
            autoPlay
            playsInline
          />
        ) : (
          <div className="waiting-screen">
            <div className="waiting-avatar">
              {remoteName ? remoteName[0].toUpperCase() : "?"}
            </div>
            {isCalling ? (
              <>
                <div className="waiting-rings">
                  <div className="ring ring1" />
                  <div className="ring ring2" />
                  <div className="ring ring3" />
                </div>
                <p className="waiting-text">Calling…</p>
              </>
            ) : (
              <p className="waiting-text">Connecting…</p>
            )}
          </div>
        )}

        {remoteName && (
          <div className="remote-nametag">
            <span className="nametag-dot" />
            {remoteName}
          </div>
        )}
      </div>

      {/* Local video (PiP) — always in DOM, hidden via CSS when off */}
      <div className={`local-pip ${isVideoOff ? "video-off" : ""}`}>
        {/* Video always mounted so srcObject is never lost */}
        <video
          ref={localRef}
          className="local-video"
          autoPlay
          playsInline
          muted
          style={{ display: isVideoOff ? "none" : "block" }}
        />
        {/* Overlay shown when video is off */}
        {isVideoOff && (
          <div className="pip-off">
            <span>📷</span>
            <span style={{ fontSize: 11 }}>Off</span>
          </div>
        )}
        <div className="pip-label">You</div>
      </div>

      {/* Controls */}
      <div className="call-controls">
        <button
          className={`ctrl-btn ${isMuted ? "ctrl-off" : ""}`}
          onClick={onToggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          <span className="ctrl-icon">{isMuted ? "🔇" : "🎙️"}</span>
          <span className="ctrl-label">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          className="ctrl-btn ctrl-end"
          onClick={onEndCall}
          title="End Call"
        >
          <span className="ctrl-icon">📵</span>
          <span className="ctrl-label">End</span>
        </button>

        <button
          className={`ctrl-btn ${isVideoOff ? "ctrl-off" : ""}`}
          onClick={onToggleVideo}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          <span className="ctrl-icon">{isVideoOff ? "🚫" : "📹"}</span>
          <span className="ctrl-label">{isVideoOff ? "Start Video" : "Stop Video"}</span>
        </button>
      </div>
    </div>
  );
}
