import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  DEFAULT_ASPECT_RATIO,
  IDEAL_VIDEO_HEIGHT,
  IDEAL_VIDEO_WIDTH,
  MESSAGES,
  MODEL_URL,
  UI_UPDATE_INTERVAL_MS,
  WASM_URL,
} from "../constants/config";
import { describeSkinColor, smoothColor } from "../utils/color";
import { averagePatchesColor, getSamplePatches } from "../utils/skinSampler";

const PATCH_OUTLINE_COLOR = "#ffffff";
const PATCH_OUTLINE_WIDTH = 2;

// load the face landmark model.
async function createFaceLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
  });
}

// connect the front camera and return the stream.
async function openCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: IDEAL_VIDEO_WIDTH },
      height: { ideal: IDEAL_VIDEO_HEIGHT },
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

// draw the skin sampling outlines.
function drawPatches(context, patches) {
  context.strokeStyle = PATCH_OUTLINE_COLOR;
  context.lineWidth = PATCH_OUTLINE_WIDTH;
  for (const patch of patches) {
    context.strokeRect(patch.x, patch.y, patch.width, patch.height);
  }
}

// manage the camera and undertone estimate.
export function useUndertoneCamera() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const frameCanvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(0);
  const isRunningRef = useRef(false);
  const isFrozenRef = useRef(false);
  const smoothedColorRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastUiUpdateRef = useRef(0);

  const [status, setStatus] = useState(MESSAGES.IDLE);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [result, setResult] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);

  // release the camera and model when leaving.
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  // size the canvases to match the video.
  function prepareCanvases(video) {
    const { videoWidth, videoHeight } = video;
    overlayRef.current.width = videoWidth;
    overlayRef.current.height = videoHeight;
    frameCanvasRef.current = document.createElement("canvas");
    frameCanvasRef.current.width = videoWidth;
    frameCanvasRef.current.height = videoHeight;
    setAspectRatio(`${videoWidth} / ${videoHeight}`);
  }

  // open the camera and start the analysis loop.
  async function start() {
    setHasStarted(true);
    try {
      if (!landmarkerRef.current) {
        setStatus(MESSAGES.LOADING_MODEL);
        landmarkerRef.current = await createFaceLandmarker();
      }
      setStatus(MESSAGES.REQUESTING_CAMERA);
      const video = videoRef.current;
      streamRef.current = await openCamera(video);
      prepareCanvases(video);

      isRunningRef.current = true;
      setStatus("");
      animationRef.current = requestAnimationFrame(loop);
    } catch (error) {
      console.error(error);
      setStatus(MESSAGES.START_ERROR + error.message);
      setHasStarted(false);
    }
  }

  // process each animation frame using the browser timestamp.
  function loop(timestamp) {
    if (!isRunningRef.current) {
      return;
    }
    const video = videoRef.current;
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      processFrame(video, timestamp);
    }
    animationRef.current = requestAnimationFrame(loop);
  }

  // find and analyze the face in the current frame.
  function processFrame(video, timestamp) {
    const detection = landmarkerRef.current.detectForVideo(video, timestamp);
    const overlay = overlayRef.current;
    const overlayContext = overlay.getContext("2d");
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);

    if (!detection.faceLandmarks?.length) {
      setStatus(MESSAGES.NO_FACE);
      return;
    }
    setStatus("");
    analyzeFace(detection.faceLandmarks[0], overlayContext, timestamp);
  }

  // smooth the sampled color and display the estimate.
  function analyzeFace(landmarks, overlayContext, timestamp) {
    const video = videoRef.current;
    const frameContext = frameCanvasRef.current.getContext("2d", { willReadFrequently: true });
    frameContext.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    const patches = getSamplePatches(landmarks, video.videoWidth, video.videoHeight);
    drawPatches(overlayContext, patches);

    const averageColor = averagePatchesColor(frameContext, patches);
    if (!averageColor) {
      return;
    }
    smoothedColorRef.current = smoothColor(smoothedColorRef.current, averageColor);

    const canUpdateScreen =
      !isFrozenRef.current && timestamp - lastUiUpdateRef.current > UI_UPDATE_INTERVAL_MS;
    if (canUpdateScreen) {
      lastUiUpdateRef.current = timestamp;
      setResult(describeSkinColor(smoothedColorRef.current));
    }
  }

  // freeze or resume the displayed estimate.
  function toggleFreeze() {
    isFrozenRef.current = !isFrozenRef.current;
    setIsFrozen(isFrozenRef.current);
  }

  return { videoRef, overlayRef, status, hasStarted, isFrozen, result, aspectRatio, start, toggleFreeze };
}
