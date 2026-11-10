/**
 * Configuración del análisis de subtono.
 * Todos los valores ajustables viven aquí para evitar números mágicos en el código (regla S3).
 */

// Recursos de MediaPipe (runtime WASM y modelo de la malla facial).
export const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Ángulo de matiz en Lab (grados): menor = más rosado/frío, mayor = más dorado/cálido.
export const HUE_COOL_BELOW = 50;
export const HUE_WARM_ABOVE = 58;

// Índices de la malla facial (478 puntos): mejillas y frente, donde se toma el color de piel.
export const SAMPLE_POINT_INDEXES = [50, 280, 205, 425, 151];
export const FACE_LEFT_EDGE_INDEX = 234;
export const FACE_RIGHT_EDGE_INDEX = 454;

// Parámetros del muestreo de píxeles.
export const PATCH_SIZE_RATIO = 0.025; // mitad del parche como fracción del ancho de la cara
export const MIN_PATCH_HALF_SIZE = 3; // píxeles
export const SMOOTHING_PREVIOUS_WEIGHT = 0.9; // peso del color anterior al suavizar
export const UI_UPDATE_INTERVAL_MS = 100;

// Límites de luminosidad (L de Lab, 0-100) fuera de los cuales el resultado es poco fiable.
export const LOW_LIGHT_LIMIT = 30;
export const HIGH_LIGHT_LIMIT = 88;

// Configuración de la cámara.
export const IDEAL_VIDEO_WIDTH = 960;
export const IDEAL_VIDEO_HEIGHT = 720;
export const DEFAULT_ASPECT_RATIO = "4 / 3";

// Textos que ve el usuario.
export const MESSAGES = {
  IDLE: "Pulsa «Iniciar cámara» para empezar.",
  LOADING_MODEL: "Cargando modelo de reconocimiento facial…",
  REQUESTING_CAMERA: "Pidiendo acceso a la cámara…",
  NO_FACE: "No veo tu cara. Mírame de frente.",
  START_ERROR: "No se pudo iniciar: ",
  LOW_LIGHT: "Hay poca luz: el resultado puede fallar.",
  HIGH_LIGHT: "Hay demasiada luz o brillo: el resultado puede fallar.",
};
