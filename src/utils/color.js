import {
  HIGH_LIGHT_LIMIT,
  HUE_COOL_BELOW,
  HUE_WARM_ABOVE,
  LOW_LIGHT_LIMIT,
  MESSAGES,
  SMOOTHING_PREVIOUS_WEIGHT,
} from "../constants/config";

// d65 reference white and standard coefficients for the srgb to xyz to lab conversion.
const D65_WHITE_X = 0.95047;
const D65_WHITE_Z = 1.08883;
const MAX_CHANNEL_VALUE = 255;
const RADIANS_TO_DEGREES = 180 / Math.PI;

// convert an encoded color channel to linear light.
function toLinear(channel) {
  const normalized = channel / MAX_CHANNEL_VALUE;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

// apply the lab compression curve.
function labCurve(ratio) {
  return ratio > 0.008856 ? Math.cbrt(ratio) : 7.787 * ratio + 16 / 116;
}

// convert rgb to lab lightness and color axes.
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

// calculate the hue angle in degrees.
export function getHueAngle(labA, labB) {
  return Math.atan2(labB, labA) * RADIANS_TO_DEGREES;
}

// classify the undertone using the hue thresholds.
export function classifyUndertone(hueAngle) {
  if (hueAngle < HUE_COOL_BELOW) {
    return "cool";
  }
  if (hueAngle > HUE_WARM_ABOVE) {
    return "warm";
  }
  return "neutral";
}

// return the estimated undertone and measured color.
export function describeSkinColor(rgb) {
  const [lightness, labA, labB] = rgbToLab(rgb);
  const hueAngle = getHueAngle(labA, labB);
  return { undertone: classifyUndertone(hueAngle), hueAngle, lightness, rgb };
}

// blend the current and previous frame colors.
export function smoothColor(previousColor, currentColor, previousWeight = SMOOTHING_PREVIOUS_WEIGHT) {
  if (!previousColor) {
    return currentColor;
  }
  return previousColor.map(
    (value, index) => value * previousWeight + currentColor[index] * (1 - previousWeight),
  );
}

// warn when lightness falls outside the configured range.
export function getLightingWarning(lightness) {
  if (lightness < LOW_LIGHT_LIMIT) {
    return MESSAGES.LOW_LIGHT;
  }
  if (lightness > HIGH_LIGHT_LIMIT) {
    return MESSAGES.HIGH_LIGHT;
  }
  return "";
}
