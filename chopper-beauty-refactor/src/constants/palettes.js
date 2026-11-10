/**
 * Paletas recomendadas para cada subtono.
 * Cada color tiene su código hexadecimal y su nombre en español.
 */
export const PALETTES = {
  warm: {
    label: "Cálido",
    metal: "Te favorece el oro.",
    colors: [
      { hex: "#C9772B", name: "Terracota" },
      { hex: "#E2A93B", name: "Mostaza" },
      { hex: "#8A8F3A", name: "Oliva" },
      { hex: "#B5532F", name: "Óxido" },
      { hex: "#E58E73", name: "Coral" },
    ],
  },
  cool: {
    label: "Frío",
    metal: "Te favorece la plata.",
    colors: [
      { hex: "#4F6FB8", name: "Azul rey" },
      { hex: "#6C4A8F", name: "Ciruela" },
      { hex: "#2F8F83", name: "Esmeralda" },
      { hex: "#C46A8E", name: "Rosa fucsia" },
      { hex: "#8FA3BF", name: "Azul hielo" },
    ],
  },
  neutral: {
    label: "Neutro",
    metal: "Te favorecen el oro y la plata.",
    colors: [
      { hex: "#B85C6A", name: "Rosa palo" },
      { hex: "#4C8C7A", name: "Verde jade" },
      { hex: "#7B6BA8", name: "Lavanda" },
      { hex: "#C98F52", name: "Caramelo" },
      { hex: "#5E7FA3", name: "Azul acero" },
    ],
  },
};
