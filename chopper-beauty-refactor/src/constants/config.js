// shared settings for the camera and undertone estimate.

// mediapipe runtime and face landmark model.
export const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// lower lab hue values are pinker; higher values are more golden.
export const HUE_COOL_BELOW = 50;
export const HUE_WARM_ABOVE = 58;

// sample skin color at the cheeks and forehead.
export const SAMPLE_POINT_INDEXES = [50, 280, 205, 425, 151];
export const FACE_LEFT_EDGE_INDEX = 234;
export const FACE_RIGHT_EDGE_INDEX = 454;

// pixel sampling settings.
export const PATCH_SIZE_RATIO = 0.025; // half of the patch as a fraction of face width
export const MIN_PATCH_HALF_SIZE = 3; // pixels
export const SMOOTHING_PREVIOUS_WEIGHT = 0.9; // previous color weight for smoothing
export const UI_UPDATE_INTERVAL_MS = 100;

// lab lightness limits for the estimate.
export const LOW_LIGHT_LIMIT = 30;
export const HIGH_LIGHT_LIMIT = 88;

// camera settings.
export const IDEAL_VIDEO_WIDTH = 960;
export const IDEAL_VIDEO_HEIGHT = 720;
export const DEFAULT_ASPECT_RATIO = "4 / 3";

// camera status and lighting messages.
export const MESSAGES = {
  IDLE: "Select Start camera to begin.",
  LOADING_MODEL: "Loading the face detection model…",
  REQUESTING_CAMERA: "Waiting for camera permission…",
  NO_FACE: "Center your face and look straight ahead.",
  START_ERROR: "Camera startup failed: ",
  LOW_LIGHT: "Low measured lightness can affect the estimate. Try softer, neutral light from the front.",
  HIGH_LIGHT: "Bright exposure can affect the estimate. Move away from glare and try softer, neutral light.",
};
