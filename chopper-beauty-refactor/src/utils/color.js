import {
  HIGH_LIGHT_LIMIT,
  HUE_COOL_BELOW,
  HUE_WARM_ABOVE,
  LOW_LIGHT_LIMIT,
  MESSAGES,
  SMOOTHING_PREVIOUS_WEIGHT,
} from "../constants/config";

// Blanco de referencia D65 (estándar CIE). Los coeficientes de las fórmulas
// sRGB → XYZ → Lab que aparecen abajo también son estándar y no se renombran (excepción de la regla S3).
const D65_WHITE_X = 0.95047;
const D65_WHITE_Z = 1.08883;
const MAX_CHANNEL_VALUE = 255;
const RADIANS_TO_DEGREES = 180 / Math.PI;

/**
 * Convierte un canal sRGB (0-255) a luz lineal (0-1).
 * @param {number} channel Valor del canal entre 0 y 255.
 * @returns {number} Valor lineal entre 0 y 1.
 */
function toLinear(channel) {
  const normalized = channel / MAX_CHANNEL_VALUE;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Función de compresión que usa el espacio Lab.
 * @param {number} ratio Cociente XYZ respecto al blanco de referencia.
 * @returns {number} Valor comprimido.
 */
function labCurve(ratio) {
  return ratio > 0.008856 ? Math.cbrt(ratio) : 7.787 * ratio + 16 / 116;
}

/**
 * Convierte un color RGB al espacio CIE Lab.
 * @param {number[]} rgb Arreglo [rojo, verde, azul], cada uno entre 0 y 255.
 * @returns {number[]} Arreglo [luminosidad, a, b].
 */
export function rgbToLab([red, green, blue]) {
  const linearRed = toLinear(red);
  const linearGreen = toLinear(green);
  const linearBlue = toLinear(blue);

  const ratioX = (linearRed * 0.4124 + linearGreen * 0.3576 + linearBlue * 0.1805) / D65_WHITE_X;
  const ratioY = linearRed * 0.2126 + linearGreen * 0.7152 + linearBlue * 0.0722;
  const ratioZ = (linearRed * 0.0193 + linearGreen * 0.1192 + linearBlue * 0.9505) / D65_WHITE_Z;

  const curveX = labCurve(ratioX);
  const curveY = labCurve(ratioY);
  const curveZ = labCurve(ratioZ);

  return [116 * curveY - 16, 500 * (curveX - curveY), 200 * (curveY - curveZ)];
}

/**
 * Calcula el ángulo de matiz (hue) en grados a partir de los ejes a y b de Lab.
 * @param {number} labA Eje verde-rojo.
 * @param {number} labB Eje azul-amarillo.
 * @returns {number} Ángulo en grados.
 */
export function getHueAngle(labA, labB) {
  return Math.atan2(labB, labA) * RADIANS_TO_DEGREES;
}

/**
 * Clasifica el subtono según el ángulo de matiz.
 * @param {number} hueAngle Ángulo de matiz en grados.
 * @returns {"cool" | "warm" | "neutral"} Subtono detectado.
 */
export function classifyUndertone(hueAngle) {
  if (hueAngle < HUE_COOL_BELOW) {
    return "cool";
  }
  if (hueAngle > HUE_WARM_ABOVE) {
    return "warm";
  }
  return "neutral";
}

/**
 * Analiza un color de piel y devuelve su subtono junto con los valores medidos.
 * @param {number[]} rgb Arreglo [rojo, verde, azul].
 * @returns {{undertone: string, hueAngle: number, lightness: number, rgb: number[]}} Resultado del análisis.
 */
export function describeSkinColor(rgb) {
  const [lightness, labA, labB] = rgbToLab(rgb);
  const hueAngle = getHueAngle(labA, labB);
  return { undertone: classifyUndertone(hueAngle), hueAngle, lightness, rgb };
}

/**
 * Mezcla el color anterior con el actual para que el resultado no parpadee.
 * @param {number[] | null} previousColor Color suavizado del cuadro anterior (o null).
 * @param {number[]} currentColor Color medido en el cuadro actual.
 * @param {number} [previousWeight] Peso del color anterior entre 0 y 1.
 * @returns {number[]} Color suavizado.
 */
export function smoothColor(previousColor, currentColor, previousWeight = SMOOTHING_PREVIOUS_WEIGHT) {
  if (!previousColor) {
    return currentColor;
  }
  return previousColor.map(
    (value, index) => value * previousWeight + currentColor[index] * (1 - previousWeight),
  );
}

/**
 * Devuelve una advertencia si la luminosidad medida hace poco fiable el resultado.
 * @param {number} lightness Luminosidad (L de Lab, 0-100).
 * @returns {string} Mensaje de advertencia, o cadena vacía si la luz es adecuada.
 */
export function getLightingWarning(lightness) {
  if (lightness < LOW_LIGHT_LIMIT) {
    return MESSAGES.LOW_LIGHT;
  }
  if (lightness > HIGH_LIGHT_LIMIT) {
    return MESSAGES.HIGH_LIGHT;
  }
  return "";
}
