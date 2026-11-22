import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { MODEL_URL, WASM_URL } from "../chopper-beauty-refactor/src/constants/config";
import { describeSkinColor, getLightingWarning, smoothColor } from "../chopper-beauty-refactor/src/utils/color";
import { averagePatchesColor, getSamplePatches } from "../chopper-beauty-refactor/src/utils/skinSampler";
import "./App.css";

const SEASONS = {
  warm: {
    light: {
      name: "Spring",
      description: "Warm and light. Start with clear, sunny shades.",
      colors: [["#f5b094", "Peach"], ["#ef816d", "Coral"], ["#efd279", "Butter"], ["#99ac69", "Apple green"]],
    },
    deep: {
      name: "Autumn",
      description: "Warm and deep. Start with rich, earthy shades.",
      colors: [["#a9573a", "Rust"], ["#b7863d", "Ochre"], ["#74744a", "Olive"], ["#704738", "Chestnut"]],
    },
  },
  cool: {
    light: {
      name: "Summer",
      description: "Cool and light. Start with soft, powdery shades.",
      colors: [["#b585a1", "Dusty rose"], ["#afa2cd", "Lavender"], ["#9eafcf", "Mist blue"], ["#899f9d", "Cool sage"]],
    },
    deep: {
      name: "Winter",
      description: "Cool and deep. Start with crisp, saturated shades.",
      colors: [["#993d69", "Berry"], ["#485997", "Royal blue"], ["#436b68", "Pine"], ["#573664", "Plum"]],
    },
  },
};
const UNDERTONES = { warm: "Warm", cool: "Cool", neutral: "Neutral" };

function Analysis({ onExit }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const grabRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const mountedRef = useRef(false);
  const frozenRef = useRef(false);
  const smoothRef = useRef(null);
  const lastTimeRef = useRef(-1);
  const lastUiRef = useRef(0);

  const [status, setStatus] = useState("");
  const [started, setStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [drape, setDrape] = useState(null);
  const [frozen, setFrozen] = useState(false);
  const [result, setResult] = useState(null);
  const [aspect, setAspect] = useState("16 / 10");

  // release the camera and model when leaving analysis.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
        setStatus("Loading the face detection model…");
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        if (!mountedRef.current) return;
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (!mountedRef.current) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
      }

      setStatus("Waiting for camera permission…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      if (!mountedRef.current) return;

      const { videoWidth, videoHeight } = video;
      overlayRef.current.width = videoWidth;
      overlayRef.current.height = videoHeight;
      grabRef.current = document.createElement("canvas");
      grabRef.current.width = videoWidth;
      grabRef.current.height = videoHeight;
      setAspect(`${videoWidth} / ${videoHeight}`);

      runningRef.current = true;
      setCameraReady(true);
      setStatus("Center your face and look straight ahead.");
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (!mountedRef.current) return;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      videoRef.current.srcObject = null;
      console.error(err);
      setStatus(err.name === "NotAllowedError"
        ? "Camera access was denied. Allow it in your browser settings, then try again."
        : "Camera startup failed. Check your camera and connection, then try again.");
      setStarted(false);
    }
  }

  function loop(frameTime) {
    if (!runningRef.current) return;
    const video = videoRef.current;
    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const detection = landmarkerRef.current.detectForVideo(video, frameTime);
      const overlayContext = overlayRef.current.getContext("2d");
      overlayContext.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

      if (detection.faceLandmarks && detection.faceLandmarks.length) {
        setStatus("");
        analyze(detection.faceLandmarks[0], overlayContext, frameTime);
      } else {
        setStatus("Center your face and look straight ahead.");
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  function analyze(landmarks, overlayContext, frameTime) {
    const video = videoRef.current;
    const { videoWidth, videoHeight } = video;
    const frameContext = grabRef.current.getContext("2d", { willReadFrequently: true });
    frameContext.drawImage(video, 0, 0, videoWidth, videoHeight);

    const patches = getSamplePatches(landmarks, videoWidth, videoHeight);
    const rgb = averagePatchesColor(frameContext, patches);
    if (!rgb) return;

    overlayContext.strokeStyle = "#ffffff";
    overlayContext.lineWidth = 2;
    for (const patch of patches) {
      overlayContext.strokeRect(patch.x, patch.y, patch.width, patch.height);
    }
    smoothRef.current = smoothColor(smoothRef.current, rgb);

    // update the result at most ten times per second.
    if (!frozenRef.current && frameTime - lastUiRef.current > 100) {
      lastUiRef.current = frameTime;
      setResult(describeSkinColor(smoothRef.current));
    }
  }

  function toggleFreeze() {
    frozenRef.current = !frozenRef.current;
    setFrozen(frozenRef.current);
  }

  const estimate = result ? UNDERTONES[result.undertone] : null;
  const lightNote = result ? getLightingWarning(result.lightness) : "";
  const [temperature, setTemperature] = useState(null);
  const [depth, setDepth] = useState(null);
  const step = temperature === null ? 0 : depth === null ? 1 : 2;
  const season = step === 2 ? SEASONS[temperature][depth] : null;
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current.focus();
  }, [step]);

  function selectComparison(value) {
    if (step === 0) setTemperature(value);
    else setDepth(value);
    setDrape(null);
  }

  function goBack() {
    if (step === 0) {
      onExit();
      return;
    }
    if (step === 1) setTemperature(null);
    else setDepth(null);
    setDrape(null);
  }

  const comparisons = step === 0
    ? [["warm", "Warm peach", "#de977e"], ["cool", "Cool pink", "#c67caa"]]
    : temperature === "warm"
      ? [["light", "Light peach", "#f1b59b"], ["deep", "Deep terracotta", "#9c4c38"]]
      : [["light", "Light lilac", "#c8b9e5"], ["deep", "Deep plum", "#5b356c"]];

  return (
    <div className="studio">
      <section className="guide" aria-labelledby="guide-title">
        <button className="text-button back" onClick={goBack}>← {step ? "Previous step" : "Home"}</button>
        <ol className="steps" aria-label="Analysis progress">
          {["Warm or cool", "Light or deep", "Your season"].map((label, index) => (
            <li key={label} aria-current={index === step ? "step" : undefined}>{label}</li>
          ))}
        </ol>
        <h1 id="guide-title" ref={headingRef} tabIndex={-1}>
          {["Warm or cool?", "Light or deep?", "Your season"][step]}
        </h1>
        {step < 2 ? (
          <>
            <p>{step === 0
              ? "Start with a clean, makeup-free face in soft, neutral light. Compare peach and pink fabric just below your chin, or try gold and silver."
              : "Compare a light pastel with a deeper, saturated color in the same undertone. Keep the lighting and distance from your face consistent."}</p>
            <p>{step === 0
              ? "Choose the family that makes your complexion look brighter and more even."
              : "Choose the depth that brings your features into focus without overpowering them."}</p>
            <div className="choices" role="group" aria-label="Choose the better match">
              {comparisons.map(([value, label, color]) => (
                <button className="choice" key={value} onClick={() => selectComparison(value)}>
                  <span className="choice-dot" style={{ background: color }} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="season-name">{season.name}</p>
            <p>{season.description} This is a starting palette based on your drape choices.</p>
            <ul className="palette" aria-label={season.name + " palette"}>
              {season.colors.map(([color, name]) => (
                <li key={name}><span className="swatch" style={{ background: color }} />{name}</li>
              ))}
            </ul>
            <button className="text-button reset" onClick={() => {
              setTemperature(null);
              setDepth(null);
              setDrape(null);
            }}>Start comparisons again</button>
          </>
        )}
      </section>
      <section className="camera" aria-labelledby="camera-title">
        <div className="camera-heading">
          <h2 id="camera-title">Camera preview</h2>
          <span>{cameraReady ? "Live" : "Optional"}</span>
        </div>
        <div className="viewport" style={{ aspectRatio: aspect }}>
          <video ref={videoRef} playsInline muted />
          <canvas ref={overlayRef} aria-hidden="true" />
          {!cameraReady && (
            <div className="camera-cover">
              <p>Use your camera as a mirror.</p>
              <button className="button camera-button" onClick={start} disabled={started}>
                {started ? "Starting camera…" : "Allow camera access"}
              </button>
            </div>
          )}
          {cameraReady && drape && <div className="drape-strip" style={{ background: drape }} aria-hidden="true" />}
        </div>
        {status && <p className="camera-status" role="status">{status}</p>}
        {cameraReady && step < 2 && (
          <div className="drapes">
            <h3>Preview drapes</h3>
            <p>Use the color strip as a visual reference, or hold real fabric near your face.</p>
            <div className="choices">
              {comparisons.map(([value, label, color]) => (
                <button className="choice" key={value} aria-pressed={drape === color}
                  onClick={() => setDrape(drape === color ? null : color)}>
                  <span className="choice-dot" style={{ background: color }} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {estimate && (
          <div className="estimate">
            <p><strong>Camera estimate</strong> {estimate} undertone</p>
            <button className="text-button" onClick={toggleFreeze}>{frozen ? "Resume estimate" : "Freeze estimate"}</button>
            {lightNote && <p className="light-note">{lightNote}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [inStudio, setInStudio] = useState(false);
  const startRef = useRef(null);

  function returnHome() {
    setInStudio(false);
    requestAnimationFrame(() => startRef.current?.focus());
  }

  return (
    <div className="app">
      <header className="brand-bar">
        <span className="wordmark">Chopper Beauty</span>
        {inStudio && <button className="text-button" onClick={returnHome}>Exit studio</button>}
      </header>
      <main>
        {inStudio ? <Analysis onExit={returnHome} /> : (
          <div className="welcome">
            <div className="welcome-content">
              <h1>Chopper Beauty</h1>
              <p className="slogan">Find the colors that bring you to life.</p>
              <p className="lead">A Korean-inspired personal color analysis. Compare drapes near your face and discover your seasonal palette.</p>
              <button className="button" ref={startRef} onClick={() => setInStudio(true)}>Start color analysis <span aria-hidden="true">→</span></button>
            </div>
            <details className="about">
              <summary>What is personal color analysis?</summary>
              <p>It matches colors to your natural features, including your skin, eyes, and hair. This studio uses two drape comparisons to explore four seasons: Spring, Summer, Autumn, and Winter.</p>
            </details>
          </div>
        )}
      </main>
    </div>
  );
}
