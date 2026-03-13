import "./IncomingCall.css";

export default function IncomingCall({ caller, onAccept, onReject }) {
  return (
    <div className="incoming-overlay">
      <div className="incoming-card">
        <div className="incoming-rings">
          <div className="i-ring i-ring1" />
          <div className="i-ring i-ring2" />
          <div className="i-ring i-ring3" />
          <div className="incoming-avatar">
            {caller ? caller[0].toUpperCase() : "?"}
          </div>
        </div>

        <div className="incoming-info">
          <p className="incoming-label">Incoming Video Call</p>
          <h3 className="incoming-name">{caller || "Unknown"}</h3>
        </div>

        <div className="incoming-actions">
          <button className="btn btn-danger i-btn" onClick={onReject}>
            📵 Decline
          </button>
          <button className="btn btn-green i-btn" onClick={onAccept}>
            📹 Accept
          </button>
        </div>
      </div>
    </div>
  );
}
