const canvas = document.getElementById("room");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");
ctx.imageSmoothingEnabled = false;

// Scale the canvas by a whole number so pixels stay sharp
function fitCanvas() {
  const scale = Math.max(
    1,
    Math.floor(Math.min(window.innerWidth / W, (window.innerHeight - 60) / H)),
  );
  canvas.style.width = W * scale + "px";
  canvas.style.height = H * scale + "px";
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

// Convert mouse position (screen px) to room position (logical px)
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height),
  };
}

let hovered = null;

canvas.addEventListener("pointermove", (e) => {
  const p = toLogical(e);
  hovered = hitTest(p.x, p.y);
  canvas.style.cursor = hovered ? "pointer" : "default";
  hint.textContent = hovered ? hovered.label : "";
  ghostOnCursorMove(p);
});

canvas.addEventListener("pointerleave", () => {
  hovered = null;
  hint.textContent = "";
  ghostOnCursorLeave();
});

canvas.addEventListener("click", (e) => {
  const p = toLogical(e);
  ghostOnClick(p);
  const obj = hitTest(p.x, p.y);
  if (obj) handleObjectClick(obj.id);
});

function handleObjectClick(id) {
  console.log("clicked:", id);
  // interactible object logicc
}

function frame(now) {
  updateGhost(now);
  drawRoom(ctx, hovered, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Greet the visitor shortly after load
setTimeout(ghostGreet, 800);
