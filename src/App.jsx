import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import "./App.css";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/* ---------- Ajustes que puedes tunear ---------- */
// Ángulo de matiz en Lab (grados). Menor = más rosado/frío, mayor = más dorado/cálido.
const HUE_COOL_BELOW = 50;
const HUE_WARM_ABOVE = 58;

// Puntos de la malla facial donde se toma el color: mejillas y frente.
const SAMPLE_POINTS = [50, 280, 205, 425, 151];

const PALETTES = {
  warm: {
    label: "Cálido",
    metal: "Te favorece el oro.",
    colors: [
      ["#C9772B", "Terracota"],
      ["#E2A93B", "Mostaza"],
      ["#8A8F3A", "Oliva"],
      ["#B5532F", "Óxido"],
      ["#E58E73", "Coral"],
    ],
  },
  cool: {
    label: "Frío",
    metal: "Te favorece la plata.",
    colors: [
      ["#4F6FB8", "Azul rey"],
      ["#6C4A8F", "Ciruela"],
      ["#2F8F83", "Esmeralda"],
      ["#C46A8E", "Rosa fucsia"],
      ["#8FA3BF", "Azul hielo"],
    ],
  },
  neutral: {
    label: "Neutro",
    metal: "Te favorecen el oro y la plata.",
    colors: [
      ["#B85C6A", "Rosa palo"],
      ["#4C8C7A", "Verde jade"],
      ["#7B6BA8", "Lavanda"],
      ["#C98F52", "Caramelo"],
      ["#5E7FA3", "Azul acero"],
    ],
  },
};
/* ------------------------------------------------ */

function rgbToLab([R, G, B]) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = lin(R), g = lin(G), b = lin(B);
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function describe(rgb) {
  const [L, a, b] = rgbToLab(rgb);
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  const key = hue < HUE_COOL_BELOW ? "cool" : hue > HUE_WARM_ABOVE ? "warm" : "neutral";
  return { key, hue, L, rgb };
}

export default function App() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const grabRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const frozenRef = useRef(false);
  const smoothRef = useRef(null);
  const lastTimeRef = useRef(-1);
  const lastUiRef = useRef(0);

  const [status, setStatus] = useState("Pulsa «Iniciar cámara» para empezar.");
  const [started, setStarted] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [result, setResult] = useState(null);
  const [aspect, setAspect] = useState("4 / 3");

  // Al cerrar la página: apagar la cámara y liberar el modelo
  useEffect(() => {
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  async function start() {
    setStarted(true);
    try {
      if (!landmarkerRef.current) {
        setStatus("Cargando modelo de reconocimiento facial…");
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
      }

      setStatus("Pidiendo acceso a la cámara…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const W = video.videoWidth, H = video.videoHeight;
      overlayRef.current.width = W;
      overlayRef.current.height = H;
      grabRef.current = document.createElement("canvas");
      grabRef.current.width = W;
      grabRef.current.height = H;
      setAspect(`${W} / ${H}`);

      runningRef.current = true;
      setStatus("");
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      setStatus("No se pudo iniciar: " + err.message);
      setStarted(false);
    }
  }

  function loop(now) {
    if (!runningRef.current) return;
    const video = videoRef.current;
    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const res = landmarkerRef.current.detectForVideo(video, now);
      const octx = overlayRef.current.getContext("2d");
      octx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

      if (res.faceLandmarks && res.faceLandmarks.length) {
        setStatus("");
        analyze(res.faceLandmarks[0], octx, now);
      } else {
        setStatus("No veo tu cara. Mírame de frente.");
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  function analyze(lm, octx, now) {
    const video = videoRef.current;
    const W = video.videoWidth, H = video.videoHeight;
    const gctx = grabRef.current.getContext("2d", { willReadFrequently: true });
    gctx.drawImage(video, 0, 0, W, H);

    // Tamaño del parche según qué tan grande se ve la cara
    const faceW = Math.hypot((lm[454].x - lm[234].x) * W, (lm[454].y - lm[234].y) * H);
    const half = Math.max(3, Math.round(faceW * 0.025));

    let r = 0, g = 0, b = 0, n = 0;
    octx.strokeStyle = "#ffffff";
    octx.lineWidth = 2;

    for (const i of SAMPLE_POINTS) {
      const x = Math.max(0, Math.round(lm[i].x * W) - half);
      const y = Math.max(0, Math.round(lm[i].y * H) - half);
      const w = Math.min(half * 2, W - x);
      const h = Math.min(half * 2, H - y);
      if (w <= 0 || h <= 0) continue;
      const d = gctx.getImageData(x, y, w, h).data;
      for (let k = 0; k < d.length; k += 4) {
        r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
      }
      octx.strokeRect(x, y, w, h);
    }
    if (!n) return;

    const rgb = [r / n, g / n, b / n];
    // Suavizado entre cuadros para que el resultado no parpadee
    smoothRef.current = smoothRef.current
      ? smoothRef.current.map((v, i) => v * 0.9 + rgb[i] * 0.1)
      : rgb;

    // Actualiza la pantalla ~10 veces por segundo
    if (!frozenRef.current && now - lastUiRef.current > 100) {
      lastUiRef.current = now;
      setResult(describe(smoothRef.current));
    }
  }

  function toggleFreeze() {
    frozenRef.current = !frozenRef.current;
    setFrozen(frozenRef.current);
  }

  const palette = result ? PALETTES[result.key] : null;
  const lightNote = !result
    ? ""
    : result.L < 30
    ? "Hay poca luz: el resultado puede fallar."
    : result.L > 88
    ? "Hay demasiada luz o brillo: el resultado puede fallar."
    : "";

  return (
    <main className="app">
      <section>
        <div className="viewport" style={{ aspectRatio: aspect }}>
          <video ref={videoRef} playsInline muted />
          <canvas ref={overlayRef} />
          {status && <p className="status">{status}</p>}
        </div>
        <div className="controls">
          <button onClick={start} disabled={started}>
            Iniciar cámara
          </button>
          <button className="secondary" onClick={toggleFreeze} disabled={!result}>
            {frozen ? "Reanudar" : "Congelar resultado"}
          </button>
        </div>
      </section>

      <section aria-live="polite">
        <h1>Chopper Camera</h1>
        <p className="lead">Descubre si te favorecen los colores cálidos o fríos.</p>

        <div className="verdict">
          <div
            className="chip"
            title="Color de piel detectado"
            style={result ? { background: `rgb(${result.rgb.map(Math.round).join(",")})` } : undefined}
          />
          <div className={`verdict-word ${result ? result.key : ""}`}>
            {palette ? palette.label : "—"}
          </div>
        </div>

        <p className="metal">{palette ? palette.metal : ""}</p>

        <ul className="palette">
          {palette &&
            palette.colors.map(([hex, name]) => (
              <li key={hex}>
                <span className="sw" style={{ background: hex }} />
                {name}
              </li>
            ))}
        </ul>

        <p className="debug">
          {result ? `Matiz ${result.hue.toFixed(1)}° · Luminosidad ${result.L.toFixed(0)}` : ""}
        </p>
        <p className="note">{lightNote}</p>
        <p className="tip">
          Para un buen resultado: luz natural de frente, sin filtros, sin maquillaje y sin luces
          de colores en la habitación.
        </p>
      </section>
    </main>
  );
}