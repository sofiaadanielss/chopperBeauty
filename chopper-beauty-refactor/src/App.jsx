import CameraControls from "./components/CameraControls";
import CameraView from "./components/CameraView";
import ResultPanel from "./components/ResultPanel";
import { useUndertoneCamera } from "./hooks/useUndertoneCamera";
import "./App.css";

/** Pantalla principal: arma la cámara, los controles y el panel de resultados. */
function App() {
  const camera = useUndertoneCamera();

  return (
    <main className="app">
      <section>
        <CameraView
          videoRef={camera.videoRef}
          overlayRef={camera.overlayRef}
          aspectRatio={camera.aspectRatio}
          status={camera.status}
        />
        <CameraControls
          hasStarted={camera.hasStarted}
          isFrozen={camera.isFrozen}
          hasResult={camera.result !== null}
          onStart={camera.start}
          onToggleFreeze={camera.toggleFreeze}
        />
      </section>
      <ResultPanel result={camera.result} />
    </main>
  );
}

export default App;
