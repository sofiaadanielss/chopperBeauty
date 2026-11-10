/**
 * Muestra el video de la cámara con el canvas donde se dibujan los parches de piel.
 * @param {object} props
 * @param {object} props.videoRef Referencia al elemento <video>.
 * @param {object} props.overlayRef Referencia al <canvas> superpuesto.
 * @param {string} props.aspectRatio Proporción del video, por ejemplo "4 / 3".
 * @param {string} props.status Mensaje de estado; si está vacío no se muestra.
 */
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
