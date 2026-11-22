// show the camera video, sampling overlay, and current status.
function CameraView({ videoRef, overlayRef, aspectRatio, status }) {
  return (
    <div className="viewport" style={{ aspectRatio }}>
      <video ref={videoRef} playsInline muted />
      <canvas ref={overlayRef} />
      {status && <p className="status">{status}</p>}
    </div>
  );
}

export default CameraView;
