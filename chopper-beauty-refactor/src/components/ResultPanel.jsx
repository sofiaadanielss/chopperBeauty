import { PALETTES } from "../constants/palettes";
import { getLightingWarning } from "../utils/color";

// show the estimated undertone, suggested metal, and palette.
function ResultPanel({ result }) {
  const palette = result ? PALETTES[result.undertone] : null;
  const skinStyle = result ? { background: `rgb(${result.rgb.map(Math.round).join(",")})` } : undefined;

  return (
    <section aria-live="polite">
      <h1>Chopper Beauty</h1>
      <p className="lead">Explore warm and cool colors.</p>

      <div className="verdict">
        <div className="chip" title="Sampled skin color" style={skinStyle} />
        <div className={`verdict-word ${result ? result.undertone : ""}`}>
          {palette ? palette.label : "—"}
        </div>
      </div>

      <p className="metal">{palette ? palette.metal : ""}</p>

      <ul className="palette">
        {palette &&
          palette.colors.map((color) => (
            <li key={color.hex}>
              <span className="sw" style={{ background: color.hex }} />
              {color.name}
            </li>
          ))}
      </ul>

      <p className="debug">
        {result ? `Hue ${result.hueAngle.toFixed(1)}° · Lightness ${result.lightness.toFixed(0)}` : ""}
      </p>
      <p className="note">{result ? getLightingWarning(result.lightness) : ""}</p>
      <p className="tip">
        Start with a clean, makeup-free face in soft, neutral light.
      </p>
    </section>
  );
}

export default ResultPanel;
