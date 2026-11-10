import { PALETTES } from "../constants/palettes";
import { getLightingWarning } from "../utils/color";

/**
 * Panel con el subtono detectado, el metal recomendado y la paleta de colores.
 * @param {object} props
 * @param {object | null} props.result Resultado de describeSkinColor, o null si aún no hay.
 */
function ResultPanel({ result }) {
  const palette = result ? PALETTES[result.undertone] : null;
  const skinStyle = result ? { background: `rgb(${result.rgb.map(Math.round).join(",")})` } : undefined;

  return (
    <section aria-live="polite">
      <h1>Chopper Camera</h1>
      <p className="lead">Descubre si te favorecen los colores cálidos o fríos.</p>

      <div className="verdict">
        <div className="chip" title="Color de piel detectado" style={skinStyle} />
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
        {result ? `Matiz ${result.hueAngle.toFixed(1)}° · Luminosidad ${result.lightness.toFixed(0)}` : ""}
      </p>
      <p className="note">{result ? getLightingWarning(result.lightness) : ""}</p>
      <p className="tip">
        Para un buen resultado: luz natural de frente, sin filtros, sin maquillaje y sin luces de
        colores en la habitación.
      </p>
    </section>
  );
}

export default ResultPanel;
