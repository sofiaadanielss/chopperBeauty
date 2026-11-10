/**
 * Botones para iniciar la cámara y congelar el resultado.
 * @param {object} props
 * @param {boolean} props.hasStarted Si la cámara ya fue iniciada.
 * @param {boolean} props.isFrozen Si el resultado está congelado.
 * @param {boolean} props.hasResult Si ya existe un resultado que congelar.
 * @param {Function} props.onStart Se ejecuta al pulsar «Iniciar cámara».
 * @param {Function} props.onToggleFreeze Se ejecuta al pulsar congelar o reanudar.
 */
function CameraControls({ hasStarted, isFrozen, hasResult, onStart, onToggleFreeze }) {
  return (
    <div className="controls">
      <button onClick={onStart} disabled={hasStarted}>
        Iniciar cámara
      </button>
      <button className="secondary" onClick={onToggleFreeze} disabled={!hasResult}>
        {isFrozen ? "Reanudar" : "Congelar resultado"}
      </button>
    </div>
  );
}

export default CameraControls;
