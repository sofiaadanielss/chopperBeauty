// start the camera and freeze or resume a result.
function CameraControls({ hasStarted, isFrozen, hasResult, onStart, onToggleFreeze }) {
  return (
    <div className="controls">
      <button onClick={onStart} disabled={hasStarted}>
        Start camera
      </button>
      <button className="secondary" onClick={onToggleFreeze} disabled={!hasResult}>
        {isFrozen ? "Resume" : "Freeze result"}
      </button>
    </div>
  );
}

export default CameraControls;
