export function savePalette(season) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1120;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fffcfb";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#542c50";
  context.fillRect(0, 0, canvas.width, 16);
  context.font = "600 26px system-ui";
  context.fillText("Chopper Beauty", 64, 86);
  context.font = "650 84px system-ui";
  context.fillText(season.name, 64, 200);
  context.font = "26px system-ui";
  context.fillText(season.description, 64, 254, 772);

  drawSwatches("Makeup colors", season.makeup, 356);
  drawSwatches("Clothing colors", season.colors, 650);

  context.fillStyle = "#542c50";
  context.font = "600 26px system-ui";
  context.fillText("Try it together", 64, 958);
  context.font = "24px system-ui";
  context.fillText(season.outfit, 64, 1006, 772);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "chopper-beauty-" + season.name.toLowerCase() + "-palette.png";
  link.click();

  function drawSwatches(title, swatches, top) {
    const gap = 16;
    const width = (772 - gap * (swatches.length - 1)) / swatches.length;
    context.fillStyle = "#542c50";
    context.font = "600 30px system-ui";
    context.fillText(title, 64, top);

    swatches.forEach(([color, label], index) => {
      const left = 64 + index * (width + gap);
      context.fillStyle = color;
      context.fillRect(left, top + 28, width, 145);
      context.fillStyle = "#2e2432";
      context.font = "22px system-ui";
      context.fillText(label, left, top + 213, width);
    });
  }
}
