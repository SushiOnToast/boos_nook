// ghost state
const ghost = {
  x: 120,
  y: 80, // centre of ghost
  homeX: 120,
  homeY: 80,
  targetX: 120, // target location where its going to
  targetY: 80,
  state: "idle", // idle,  happy,  sleepy,  surprised,  waving
  stateUntil: 0, // timestamp when a timed state ends
  facing: 1, // -1 left, 1 right
  lookX: 0,
  lookY: 0, // eye offset (looking towards cursor)
  blinkUntil: 0,
  nextBlink: 2000, // blink timer
  lastInteraction: performance.now(),
  ignoring: false,  // behaviour ehen busy with ghost things
  ignoreUntil: 0,
  nextIgnoreCheck: 5000,
  speech: "", // bubble text an timing management
  speechUntil: 0,
  cursor: null, // x, y coords of cursor INSIDE canvas, null if outside
};

const GHOST_R = 10; // body radius for placeholder drawing

const LINES = {
  happy: ["hi!!", ":D", "hehe", "oh! hello"],
  surprised: ["eek!!!", "oh! you startled me", "boo? ...wait, that's my job"],
  waving: ["a visitor!", "hello, hello", "welcome to my room"],
  sleepy: ["*yawn*", "zzz...", "so sleepy..."],
  watching: ["leaving already?", "bye..."],
};

// helper function: pick random item from array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// set speech bubble + timer to clear
function say(text, ms = 2500) {
  ghost.speech = text;
  ghost.speechUntil = performance.now() + ms;
}

// changes state, optional parameters are duration and lines for speech bubble
function setState(state, durationMs = 0, line = null) {
  ghost.state = state;
  ghost.stateUntil = durationMs ? performance.now() + durationMs : 0;
  if (line) say(line);
}

// functions below called from main.js, they update state

function ghostGreet() {
  setState("waving", 2500, pick(LINES.waving));
}

function ghostOnCursorMove(p) {
  ghost.cursor = p;
  ghost.lastInteraction = performance.now();
  if (ghost.state === "sleepy")
    setState("surprised", 1200, pick(LINES.surprised));
}

function ghostOnCursorLeave() {
  if (ghost.cursor && !ghost.ignoring && ghost.state === "idle") {
    say(pick(LINES.watching), 2000);
  }
  ghost.cursor = null;
}

function ghostOnClick(p) {
  const d = Math.hypot(p.x - ghost.x, p.y - ghost.y);
  if (d < GHOST_R + 6) {
    ghost.lastInteraction = performance.now();
    setState("happy", 1800, pick(LINES.happy));
  }
}

function ghostSay(text, ms) {
  say(text, ms);
}

// update every frame
function updateGhost(now) {
  // switch state back to idle if current state time has run out
  if (ghost.stateUntil && now > ghost.stateUntil) {
    ghost.state = "idle";
    ghost.stateUntil = 0;
  }

  // sleep after 20s of no interaction
  if (ghost.state === "idle" && now - ghost.lastInteraction > 20000) {
    setState("sleepy", 0, pick(LINES.sleepy));
  }

  // blinking
  if (now > ghost.nextBlink) {
    ghost.blinkUntil = now + 150;
    ghost.nextBlink = now + 2000 + Math.random() * 3500;
  }

  // Occasionally decide to ignore the cursor (busy with ghost things)
  if (now > ghost.nextIgnoreCheck) {
    ghost.ignoring = Math.random() < 0.25;
    ghost.ignoreUntil = now + 3000 + Math.random() * 3000;
    ghost.nextIgnoreCheck = ghost.ignoreUntil + 2000 + Math.random() * 4000;
  }
  if (ghost.ignoring && now > ghost.ignoreUntil) ghost.ignoring = false;

  // using lerp to slowly move pupils towards cursor rather than snapping
  let tx = 0,
    ty = 0;
  if (ghost.cursor && !ghost.ignoring && ghost.state !== "sleepy") {
    const dx = ghost.cursor.x - ghost.x;
    const dy = ghost.cursor.y - ghost.y;
    const dist = Math.hypot(dx, dy) || 1;
    tx = dx / dist; // normalised directions
    ty = dy / dist;
    if (Math.abs(dx) > 6) ghost.facing = dx > 0 ? 1 : -1;

    // Get excited when the cursor is close
    if (dist < 15 && ghost.state === "idle") {
      setState("happy", 1500, pick(LINES.happy));
    }
  }
  // actually moving the eyes
  ghost.lookX += (tx - ghost.lookX) * 0.12; 
  ghost.lookY += (ty - ghost.lookY) * 0.12;

  // pick new spot to move to every so often
  if (
    ghost.state === "idle" &&
    Math.hypot(ghost.targetX - ghost.x, ghost.targetY - ghost.y) < 2
  ) {
    if (Math.random() < 0.004) {
      ghost.targetX = 40 + Math.random() * (W - 80);
      ghost.targetY = 50 + Math.random() * (H - 90);
    }
  }
  if (ghost.state === "idle" || ghost.state === "happy") {
    ghost.x += (ghost.targetX - ghost.x) * 0.01;
    ghost.y += (ghost.targetY - ghost.y) * 0.01;
  }

  // Clear old speech
  if (ghost.speech && now > ghost.speechUntil) ghost.speech = "";
}

// draw
function drawGhost(ctx, now) {
  const t = now / 1000;

  // Per-state motion
  let bobAmp = 2,
    bobSpeed = 2,
    wiggle = 0;
  if (ghost.state === "happy") {
    bobAmp = 3;
    bobSpeed = 6;
    wiggle = Math.sin(t * 14) * 2;
  }
  if (ghost.state === "sleepy") {
    bobAmp = 1;
    bobSpeed = 0.8;
  }
  if (ghost.state === "surprised") {
    bobAmp = 0;
    wiggle = Math.sin(t * 40) * 1;
  }
  if (ghost.state === "waving") {
    bobAmp = 2;
    bobSpeed = 3;
  }

  const bob = Math.sin(t * bobSpeed) * bobAmp;
  const cx = Math.round(ghost.x + wiggle);
  const cy = Math.round(ghost.y + bob);

  // Soft shadow on floor
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, ghost.y + GHOST_R + 8, GHOST_R * 0.8, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = "#F4EFFB";
  ctx.beginPath();
  ctx.arc(cx, cy, GHOST_R, Math.PI, 0);
  ctx.lineTo(cx + GHOST_R, cy + GHOST_R);
  const waves = 4,
    ww = (GHOST_R * 2) / waves;
  for (let i = 0; i < waves; i++) {
    const x1 = cx + GHOST_R - i * ww;
    const dir = i % 2 === 0 ? 3 : -1; // makes the wavy pattern
    ctx.quadraticCurveTo(
      x1 - ww / 2,
      cy + GHOST_R + dir,
      x1 - ww,
      cy + GHOST_R,
    );
  }
  ctx.closePath();
  ctx.fill();

  // Eyes
  const eyeY = cy - 2;
  const blinking = now < ghost.blinkUntil;
  const closed = blinking || ghost.state === "sleepy";
  ctx.fillStyle = "#171326";
  for (const ex of [cx - 4, cx + 4]) {
    if (closed) {
      ctx.fillRect(ex - 2, eyeY, 4, 1); // 4x1 line
    } else if (ghost.state === "surprised") {
      ctx.fillRect(ex - 2, eyeY - 3, 4, 6); // big eyes
    } else if (ghost.state === "happy" || ghost.state === "waving") {
      // happy eyes or waving - 3 small rectangles
      ctx.fillRect(ex - 2, eyeY, 1, 1);
      ctx.fillRect(ex - 1, eyeY - 1, 2, 1);
      ctx.fillRect(ex + 1, eyeY, 1, 1);
    } else {
      ctx.fillRect(
        ex - 1 + Math.round(ghost.lookX * 1.5),
        eyeY - 1 + Math.round(ghost.lookY * 1.5),
        2,
        3,
      );
    }
  }

  // Cheeks when happy
  if (ghost.state === "happy") {
    ctx.fillStyle = "#D99DB8";
    ctx.fillRect(cx - 8, eyeY + 3, 3, 2);
    ctx.fillRect(cx + 5, eyeY + 3, 3, 2);
  }

  // Speech bubble
  if (ghost.speech) drawBubble(ctx, ghost.speech, cx, cy - GHOST_R - 8);
}

function drawBubble(ctx, text, x, y) {
  ctx.font = "8px monospace";
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  const h = 12;
  const bx = Math.max(2, Math.min(W - w - 2, Math.round(x - w / 2)));
  const by = Math.max(2, Math.round(y - h));
  ctx.fillStyle = "#F4EFFB";
  ctx.fillRect(bx, by, w, h);
  ctx.fillRect(Math.round(x) - 1, by + h, 3, 2); // little tail
  ctx.fillStyle = "#171326";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + 4, by + h / 2 + 0.5);
}
