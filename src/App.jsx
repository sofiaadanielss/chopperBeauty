import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { MODEL_URL, WASM_URL } from "./constants/config";
import { describeSkinColor, getLightingWarning, smoothColor } from "./utils/color";
import { averagePatchesColor, getSamplePatches } from "./utils/skinSampler";
import { savePalette } from "./utils/savePalette";
import logo from "./assets/logo.jpg";
import "./App.css";

const SEASONS = {
  warm: {
    light: {
      name: "Spring",
      outfit: "Try an apple-green cardigan over a butter-yellow top, with peach blush.",
      makeup: [["#ef8f78","Peach blush"],["#e86f63","Coral lip"],["#c69660","Champagne shadow"]],
      description: "Warm and light. Start with clear, sunny shades.",
      colors: [["#f5b094", "Peach"], ["#ef816d", "Coral"], ["#efd279", "Butter"], ["#99ac69", "Apple green"]],
    },
    deep: {
      name: "Autumn",
      outfit: "Pair an olive jacket with a chestnut top and a brick-red lip.",
      makeup: [["#b86149","Terracotta blush"],["#98513f","Brick-red lip"],["#a26e42","Bronze shadow"]],
      description: "Warm and deep. Start with rich, earthy shades.",
      colors: [["#a9573a", "Rust"], ["#b7863d", "Ochre"], ["#74744a", "Olive"], ["#704738", "Chestnut"]],
    },
  },
  cool: {
    light: {
      name: "Summer",
      outfit: "Pair a mist-blue shirt with cool sage trousers and a soft mauve lip.",
      makeup: [["#c1849e","Cool rose blush"],["#ad6f91","Soft mauve lip"],["#a897b8","Lilac-taupe shadow"]],
      description: "Cool and light. Start with soft, powdery shades.",
      colors: [["#b585a1", "Dusty rose"], ["#afa2cd", "Lavender"], ["#9eafcf", "Mist blue"], ["#899f9d", "Cool sage"]],
    },
    deep: {
      name: "Winter",
      outfit: "Wear a royal-blue top with pine trousers and a berry lip.",
      makeup: [["#c46791","Cool pink blush"],["#911c49","Berry lip"],["#675169","Plum shadow"]],
      description: "Cool and deep. Start with crisp, saturated shades.",
      colors: [["#993d69", "Berry"], ["#485997", "Royal blue"], ["#436b68", "Pine"], ["#573664", "Plum"]],
    },
  },
};
// use sampled lightness as a starting point for comparing drape depth.
const LIGHT_DRAPE_THRESHOLD = 60;
const UNDERTONES = { warm: "Warm", cool: "Cool", neutral: "Neutral" };

const DRAPE_PAIRS = {
  temperature: [
    [["warm", "Warm peach", "#de977e"], ["cool", "Cool pink", "#c67caa"]],
    [["warm", "Warm gold", "#c99e56"], ["cool", "Cool silver", "#a6adbf"]],
  ],
  warm: [
    [["light", "Light peach", "#f1b59b"], ["deep", "Deep terracotta", "#9c4c38"]],
    [["light", "Butter yellow", "#f4da91"], ["deep", "Deep ochre", "#966323"]],
  ],
  cool: [
    [["light", "Light lilac", "#c8b9e5"], ["deep", "Deep plum", "#5b356c"]],
    [["light", "Ice blue", "#b8d7eb"], ["deep", "Deep cobalt", "#334b91"]],
  ],
  unsure: [
    [["light", "Light rose", "#e8b9c3"], ["deep", "Deep rose", "#8e4059"]],
    [["light", "Soft blue", "#b5c9dc"], ["deep", "Deep navy", "#354460"]],
  ],
};

const NO_FACE_STATUS = "Center your face and look straight ahead.";

function Analysis({ onExit }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const grabRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const cameraRequestRef = useRef(null);
  const frozenRef = useRef(false);
  const smoothRef = useRef(null);
  const lastTimeRef = useRef(-1);
  const lastUiRef = useRef(0);

  const [status, setStatus] = useState("");
  const [started, setStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [comparisonFrame, setComparisonFrame] = useState(null);
  const [frozen, setFrozen] = useState(false);
  const [result, setResult] = useState(null);
  const [aspect, setAspect] = useState("16 / 10");

  // release the camera and model when leaving analysis.
  useEffect(() => {
    return () => {
      cameraRequestRef.current?.abort();
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  async function start() {
    const request = new AbortController();
    cameraRequestRef.current = request;
    setStarted(true);
    try {
      if (!landmarkerRef.current) {
        setStatus("Loading the face detection model…");
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        if (request.signal.aborted) return;
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (request.signal.aborted) {
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
      if (request.signal.aborted) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      if (request.signal.aborted) return;

      const { videoWidth, videoHeight } = video;
      overlayRef.current.width = videoWidth;
      overlayRef.current.height = videoHeight;
      grabRef.current = document.createElement("canvas");
      grabRef.current.width = videoWidth;
      grabRef.current.height = videoHeight;
      setAspect(`${videoWidth} / ${videoHeight}`);

      runningRef.current = true;
      setCameraReady(true);
      setStatus(NO_FACE_STATUS);
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (request.signal.aborted) return;
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
        setStatus(NO_FACE_STATUS);
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
  const [manualChoice, setManualChoice] = useState(null);
  const [pairIndex, setPairIndex] = useState(0);
  const step = temperature === null ? 0 : depth === null ? 1 : 2;
  const seasons = step === 2
    ? Object.entries(SEASONS)
      .filter(([value]) => temperature === "unsure" || value === temperature)
      .flatMap(([, family]) => Object.entries(family)
        .filter(([value]) => depth === "unsure" || value === depth)
        .map(([, season]) => season))
    : [];
  const hasResults = seasons.length > 0;
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current.focus();
  }, [step]);

  const usableEstimate = result && !lightNote && (frozen || !status);
  const cameraSuggestion = usableEstimate
    ? step === 0
      ? result.undertone === "neutral" ? null : result.undertone
      : result.lightness >= LIGHT_DRAPE_THRESHOLD ? "light" : "deep"
    : null;
  const selectedChoice = manualChoice ?? cameraSuggestion;

  function confirmComparison(choice = selectedChoice) {
    if (!choice) return;
    if (step === 0) setTemperature(choice);
    else {
      stopCamera();
      setDepth(choice);
    }
    setManualChoice(null);
    setPairIndex(0);
    setComparisonFrame(null);
  }

  function stopCamera() {
    cameraRequestRef.current?.abort();
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    grabRef.current = null;
    smoothRef.current = null;
    frozenRef.current = false;
    lastTimeRef.current = -1;
    lastUiRef.current = 0;
    setStarted(false);
    setCameraReady(false);
    setFrozen(false);
    setResult(null);
    setStatus("");
    setAspect("16 / 10");
  }

  function goBack() {
    if (step === 0) {
      onExit();
      return;
    }
    const previousChoice = step === 1 ? temperature : depth;
    setManualChoice(previousChoice === "unsure" ? null : previousChoice);
    if (step === 1) setTemperature(null);
    else setDepth(null);
    setPairIndex(0);
    setComparisonFrame(null);
  }

  const comparisons = DRAPE_PAIRS[step === 0 ? "temperature" : temperature][pairIndex];

  function captureComparison() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || status) return;
    const frame = document.createElement("canvas");
    frame.width = Math.min(video.videoWidth, 640);
    frame.height = Math.round(frame.width * video.videoHeight / video.videoWidth);
    frame.getContext("2d").drawImage(video, 0, 0, frame.width, frame.height);
    setComparisonFrame(frame.toDataURL("image/jpeg", 0.85));
  }

  return (
    <div className={hasResults ? "studio studio-results" : "studio"}>
      <section className="guide" aria-labelledby="guide-title">
        <button className="text-button back" onClick={goBack}>← {step ? "Previous step" : "Home"}</button>
        <ol className="steps" aria-label="Analysis progress">
          {["Warm or cool", "Light or deep", "Results"].map((label, index) => (
            <li key={label} aria-current={index === step ? "step" : undefined}>{label}</li>
          ))}
        </ol>
        <h1 id="guide-title" ref={headingRef} tabIndex={-1}>
          {["Warm or cool?", "Light or deep?", "Results"][step]}
        </h1>
        {step < 2 ? (
          <>
            <p>{step === 0
              ? "Start with a clean, makeup-free face in soft, neutral light. Compare peach and pink fabric just below your chin, or try gold and silver."
              : "Compare a light pastel with a deeper, saturated color in the same undertone. Keep the lighting and distance from your face consistent."}</p>
            <div className="comparison-guide">
              <h2>What to look for</h2>
              <p>{step === 0
                ? "Which color makes your complexion look more even? Compare the shadows around your eyes and jaw."
                : "Which color lets you notice your features first? Compare how clearly your eyes and lips stand out."}</p>
            </div>
            <p className="choice-hint">{cameraSuggestion
              ? step === 0 ? "Suggested from your camera undertone estimate." : "Suggested from the lightness of your camera sample."
              : usableEstimate && step === 0
                ? "The camera read your undertone as neutral. Compare both options and choose the one you prefer."
                : "Use the camera for a suggestion, or choose an option yourself."}</p>
            <div className="drape-options">
              <div className="pair-switch" role="group" aria-label="Drape pair">
                {["First pair", "Second pair"].map((label, index) => (
                  <button className="pair-option" key={label} aria-pressed={pairIndex === index}
                    onClick={() => setPairIndex(index)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="choices" role="group" aria-label="Choose the better match">
                {comparisons.map(([value, label, color]) => (
                  <button className="choice" key={value} aria-pressed={selectedChoice === value}
                    onClick={() => setManualChoice(value)}>
                    <span className="choice-dot" style={{ background: color }} aria-hidden="true" />
                    {label}
                    {cameraSuggestion === value && <span className="camera-pick">Camera pick</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="decision-actions">
              <button className="button confirm-choice" onClick={() => confirmComparison()} disabled={!selectedChoice}>
                {step === 0 ? "Continue" : "See my season"}
              </button>
              <button className="text-button" onClick={() => confirmComparison("unsure")}>I’m not sure</button>
            </div>
          </>
        ) : (
          <>
            {seasons.length > 1 && (
              <p>{temperature === "unsure" && depth === "unsure"
                ? "Both comparisons are open. Explore the four palettes, or go back and try another drape pair."
                : temperature === "unsure"
                  ? "These two seasons share the depth you chose. Compare warm and cool drapes again to narrow it down."
                  : "These two seasons share the undertone you chose. Compare light and deep drapes again to narrow it down."}</p>
            )}
            {seasons.map((season) => (
              <section className="season-result" key={season.name}>
                <h2 className="season-name">{season.name}</h2>
                <p>{season.description}</p>
                <div className="result-palettes">
                  <ResultPalette title="Makeup colors" colors={season.makeup} />
                  <ResultPalette title="Clothing colors" colors={season.colors} />
                </div>
                <p>{season.outfit}</p>
                <button className="button save-palette" onClick={() => savePalette(season)}
                  aria-label={`Save ${season.name} palette`}>Save palette</button>
              </section>
            ))}
            <button className="text-button reset" onClick={() => {
              setTemperature(null);
              setDepth(null);
              setManualChoice(null);
              setPairIndex(0);
              setComparisonFrame(null);
            }}>Start comparisons again</button>
          </>
        )}
      </section>
      {!hasResults && (
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
          </div>
          <p className="camera-status" role="status">
            {status || (cameraReady && (lightNote || (result ? "Face detected. You can capture a comparison." : "Reading your face…")))}
          </p>
          {cameraReady && (
            <div className="drapes">
              <h3>Compare drapes side by side</h3>
              <p>Capture one frame to compare both colors under the same lighting.</p>
              <button className="choice capture-button" onClick={captureComparison} disabled={Boolean(status) || !result}>
                {comparisonFrame ? "Retake comparison" : "Capture comparison"}
              </button>
              {comparisonFrame && (
                <div className="drape-comparison">
                  {comparisons.map(([value, label, color]) => (
                    <figure key={value}>
                      <img src={comparisonFrame} alt={`Your camera still beside ${label.toLowerCase()}`} />
                      <figcaption>
                        <span className="comparison-color" style={{ background: color }} aria-hidden="true" />
                        {label}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}
          {estimate && (
            <div className="estimate">
              <p><strong>Camera estimate</strong> {estimate} undertone</p>
              <button className="text-button" onClick={toggleFreeze}>{frozen ? "Resume estimate" : "Freeze estimate"}</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ResultPalette({ title, colors }) {
  return (
    <section className="result-palette">
      <h3>{title}</h3>
      <ul className="palette" aria-label={title} style={{ "--swatch-count": colors.length }}>
        {colors.map(([color, name]) => (
          <li key={name}><span className="swatch" style={{ background: color }} />{name}</li>
        ))}
      </ul>
    </section>
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
        <span className="wordmark">
          <img className="brand-logo" src={logo} width="48" height="48" alt="" />
          Chopper Beauty
        </span>
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
