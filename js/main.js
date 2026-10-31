const canvas = document.getElementById("room");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");
const HINT_DEFAULT = "click on things to interact";
hint.textContent = HINT_DEFAULT;
ctx.imageSmoothingEnabled = false;

const RESERVED_V = 150; // space for the title above and hint + credit below

function fitCanvas() {
  const fit = Math.min(
    window.innerWidth / W,
    (window.innerHeight - RESERVED_V) / H,
  );
  const scale = fit >= 2 ? Math.floor(fit) : Math.max(fit, 1);
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
  hint.textContent = hovered ? hovered.label : HINT_DEFAULT;
  ghostOnCursorMove(p);
});

canvas.addEventListener("pointerleave", () => {
  hovered = null;
  hint.textContent = HINT_DEFAULT;
  ghostOnCursorLeave();
});

canvas.addEventListener("click", (e) => {
  const p = toLogical(e);
  ghostOnClick(p);
  const obj = hitTest(p.x, p.y);
  if (obj) handleObjectClick(obj.id);
});

const BED_LINES = [
  "that's my bed. i like to lie there and contemplate life",
  "do ghosts sleep?",
  "there's a monster under there. it's me.",
  "i think it's comfy, i dunno since i can't feel it",
  "shh. the bed is resting.",
];

function handleObjectClick(id) {
  if (id === "diary") openDiary();
  if (id === "radio") openRadio();
  if (id === "basket") openCandy();
  if (id === "window") startShootingStar(true);
  if (id === "bed") ghostSay(pick(BED_LINES), 3500);
}

function frame(now) {
  updateGhost(now);
  drawRoom(ctx, hovered, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Greet the visitor shortly after load
setTimeout(ghostGreet, 800);

// ---- The ghost occasionally talks to itself ----
const IDLE_CHATTER = [
  () =>
    basketState.count
      ? `i have ${basketState.count} piece${basketState.count === 1 ? "" : "s"} of candy. not that i'm counting.`
      : null,
  () => "gerald is out there again.",
  () => "is it still halloween?",
  () => "it's dusty? you must be hallucinating",
  () => "i think the radio is haunted. ...by me.",
];

setInterval(() => {
  const overlayOpen = diaryOpen || radioOpen || candyOpen;
  if (
    overlayOpen ||
    ghost.state !== "idle" ||
    ghost.speech ||
    Math.random() < 0.4
  )
    return;
  const line = pick(IDLE_CHATTER)();
  if (line) ghostSay(line, 3500);
}, 15000);
