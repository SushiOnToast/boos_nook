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
  lookY: 0, // eye offset (looking towards cursor / direction of travel)
  blinkUntil: 0,
  nextBlink: 2000, // blink timer
  lastInteraction: performance.now(),
  ignoring: false, // behaviour when busy with ghost things
  ignoreUntil: 0,
  nextIgnoreCheck: 5000,
  speech: "", // bubble text and timing management
  speechUntil: 0,
  cursor: null, // x, y coords of cursor INSIDE canvas, null if outside

  // movement
  moving: false,
  moveX: 0,
  moveY: 0, // direction it's travelling (unit vector)
  nextMove: 3000, // when it's allowed to pick a new destination
  lastUpdate: 0,
};

const GHOST_R = 10; // body radius for placeholder drawing
const GHOST_SPEED = 16; // logical pixels per second (try 10-25)

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

// choose somewhere new to float to (at least 50px away, so it never hops on the spot)
function pickNewTarget() {
  for (let i = 0; i < 10; i++) {
    const x = 40 + Math.random() * (W - 80);
    const y = 50 + Math.random() * (H - 90);
    if (Math.hypot(x - ghost.x, y - ghost.y) > 50) {
      ghost.targetX = x;
      ghost.targetY = y;
      return;
    }
  }
}

// is a point (logical px) on the ghost? used for the cursor change
function ghostContains(p) {
  return Math.hypot(p.x - ghost.x, p.y - ghost.y) < GHOST_R + 6;
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
  if (ghostContains(p)) {
    ghost.lastInteraction = performance.now();
    setState("happy", 1800, pick(LINES.happy));
  }
}

function ghostSay(text, ms) {
  say(text, ms);
}

// update every frame
function updateGhost(now) {
  // seconds since last frame (capped so a tab switch doesn't teleport the ghost)
  const dt = Math.min((now - (ghost.lastUpdate || now)) / 1000, 0.05);
  ghost.lastUpdate = now;

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

  // where is the cursor relative to the ghost? (computed once, used twice below)
  const c = ghost.cursor;
  let cdx = 0,
    cdy = 0,
    cdist = Infinity;
  if (c) {
    cdx = c.x - ghost.x;
    cdy = c.y - ghost.y;
    cdist = Math.hypot(cdx, cdy) || 1;
  }

  // Get excited when the cursor is close
  if (c && !ghost.ignoring && cdist < 15 && ghost.state === "idle") {
    setState("happy", 1500, pick(LINES.happy));
  }

  // movement: constant speed towards the target, only while idle
  ghost.moving = false;
  if (ghost.state === "idle") {
    const mdx = ghost.targetX - ghost.x;
    const mdy = ghost.targetY - ghost.y;
    const mdist = Math.hypot(mdx, mdy);

    if (mdist > 1) {
      const step = Math.min(GHOST_SPEED * dt, mdist); // never overshoot
      ghost.x += (mdx / mdist) * step;
      ghost.y += (mdy / mdist) * step;
      ghost.moving = true;
      ghost.moveX = mdx / mdist;
      ghost.moveY = mdy / mdist;
      if (Math.abs(mdx) > 1) ghost.facing = mdx > 0 ? 1 : -1;
    } else {
      // arrived: rest for a bit, then choose somewhere new
      if (ghost.nextMove === Infinity) {
        ghost.nextMove = now + 2500 + Math.random() * 4000;
      }
      if (now > ghost.nextMove) {
        pickNewTarget();
        ghost.nextMove = Infinity; // timer restarts when it arrives
      }
    }
  }

  // where should the eyes point?
  //   travelling -> look where it's going
  //   standing still and not ignoring you -> look at the cursor
  //   otherwise -> look straight ahead
  let tx = 0,
    ty = 0;
  if (ghost.state !== "sleepy") {
    if (ghost.moving) {
      tx = ghost.moveX;
      ty = ghost.moveY;
    } else if (c && !ghost.ignoring) {
      tx = cdx / cdist;
      ty = cdy / cdist;
    }
  }
  // lerp so the eyes glide between targets instead of snapping
  ghost.lookX += (tx - ghost.lookX) * 0.12;
  ghost.lookY += (ty - ghost.lookY) * 0.12;

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

  // Speech bubble (HTML overlay, so the text is crisp instead of pixelated)
  updateBubble(cx, cy);
}

// speech bubble

let bubbleEl = null;

function getBubble() {
  if (bubbleEl) return bubbleEl;

  const style = document.createElement("style");
    style.textContent = `
    #ghost-bubble {
      position: fixed;
      transform: translate(-50%, -100%);
      background: #F4EFFB;
      color: #171326;
      font-family: "Tiny5", sans-serif;
      line-height: 1;
      padding: calc(var(--px) * 2) calc(var(--px) * 4);
      border-radius: 0;
      white-space: nowrap;
      pointer-events: none; /* clicks pass through to the canvas */
      opacity: 0;
      z-index: 10;
    }
    #ghost-bubble::after { /* square pixel tail */
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      width: calc(var(--px) * 3);
      height: calc(var(--px) * 2);
      background: #F4EFFB;
      transform: translateX(-50%);
    }
  `;
  document.head.appendChild(style);

  bubbleEl = document.createElement("div");
  bubbleEl.id = "ghost-bubble";
  document.body.appendChild(bubbleEl);
  return bubbleEl;
}

// cx, cy = ghost position in logical (canvas) pixels
function updateBubble(cx, cy) {
  const el = getBubble();
  if (!ghost.speech) {
    el.style.opacity = 0;
    return;
  }

  const roomCanvas = document.getElementById("room");
  const r = roomCanvas.getBoundingClientRect();
  const scale = r.width / W; // screen pixels per logical pixel

  if (el.textContent !== ghost.speech) el.textContent = ghost.speech;
  el.style.setProperty("--px", scale + "px"); 
  el.style.fontSize = Math.round(scale * 8) + "px";
  el.style.opacity = 1;

  // convert logical position to screen position, then keep it inside the room
  const half = el.offsetWidth / 2;
  let left = r.left + cx * scale;
  left = Math.max(r.left + half + 4, Math.min(r.right - half - 4, left));
  let top = r.top + (cy - GHOST_R - 6) * scale;
  top = Math.max(r.top + el.offsetHeight + 8, top);

  el.style.left = left + "px";
  el.style.top = top + "px";
}
