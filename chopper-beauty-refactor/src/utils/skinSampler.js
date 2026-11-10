import {
  FACE_LEFT_EDGE_INDEX,
  FACE_RIGHT_EDGE_INDEX,
  MIN_PATCH_HALF_SIZE,
  PATCH_SIZE_RATIO,
  SAMPLE_POINT_INDEXES,
} from "../constants/config";

const CHANNELS_PER_PIXEL = 4; // R, G, B, A

/**
 * Calcula los parches cuadrados de piel (mejillas y frente) a partir de los puntos de la malla facial.
 * @param {{x: number, y: number}[]} landmarks Puntos de la cara con coordenadas normalizadas (0-1).
 * @param {number} width Ancho del video en píxeles.
 * @param {number} height Alto del video en píxeles.
 * @returns {{x: number, y: number, width: number, height: number}[]} Parches en píxeles.
 */
export function getSamplePatches(landmarks, width, height) {
  const leftEdge = landmarks[FACE_LEFT_EDGE_INDEX];
  const rightEdge = landmarks[FACE_RIGHT_EDGE_INDEX];
  const faceWidth = Math.hypot((rightEdge.x - leftEdge.x) * width, (rightEdge.y - leftEdge.y) * height);
  // El parche crece o se reduce según qué tan cerca esté la cara de la cámara.
  const halfSize = Math.max(MIN_PATCH_HALF_SIZE, Math.round(faceWidth * PATCH_SIZE_RATIO));

  return SAMPLE_POINT_INDEXES.map((pointIndex) => {
    const patchX = Math.max(0, Math.round(landmarks[pointIndex].x * width) - halfSize);
    const patchY = Math.max(0, Math.round(landmarks[pointIndex].y * height) - halfSize);
    return {
      x: patchX,
      y: patchY,
      width: Math.min(halfSize * 2, width - patchX),
      height: Math.min(halfSize * 2, height - patchY),
    };
  }).filter((patch) => patch.width > 0 && patch.height > 0);
}

/**
 * Promedia el color de todos los píxeles dentro de los parches indicados.
 * @param {CanvasRenderingContext2D} context Contexto del canvas que contiene el cuadro de video.
 * @param {{x: number, y: number, width: number, height: number}[]} patches Parches a promediar.
 * @returns {number[] | null} Arreglo [rojo, verde, azul], o null si no había píxeles.
 */
export function averagePatchesColor(context, patches) {
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let pixelCount = 0;

  for (const patch of patches) {
    const { data } = context.getImageData(patch.x, patch.y, patch.width, patch.height);
    for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
      redSum += data[offset];
      greenSum += data[offset + 1];
      blueSum += data[offset + 2];
      pixelCount += 1;
    }
  }

  if (pixelCount === 0) {
    return null;
  }
  return [redSum / pixelCount, greenSum / pixelCount, blueSum / pixelCount];
}
