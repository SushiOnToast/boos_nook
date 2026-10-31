const GLASS_INSET = { l: 3, t: 3, r: 3, b: 3 };

const MOON = [".##..", "##...", "##...", "##...", ".##.."];

// a handful of fixed stars (positions are 0-1 across the glass)
const STARS = [
  { u: 0.12, v: 0.25, phase: 0.0, speed: 0.5 },
  { u: 0.4, v: 0.15, phase: 2.1, speed: 0.4 },
  { u: 0.3, v: 0.65, phase: 4.0, speed: 0.6 },
  { u: 0.58, v: 0.55, phase: 1.3, speed: 0.45 },
  { u: 0.08, v: 0.8, phase: 5.2, speed: 0.55 },
];

const shootingStar = { active: false, startedAt: 0, duration: 900, sy: 0 };
let nextShootingStar = 5000; // first one shortly after load

const STAR_LINES = [
  "ooh! a shooting star!",
  "quick, make a wish!",
  "did you see that?!",
  "i wished for pockets.",
];

function startShootingStar(fromClick = false) {
  const now = performance.now();
  shootingStar.active = true;
  shootingStar.startedAt = now;
  shootingStar.sy = Math.random() * 0.35; // starts in the upper part of the glass
  nextShootingStar = now + 12000 + Math.random() * 18000;
  // the ghost reacts when you click, or sometimes on its own
  if (
    fromClick ||
    (ghost.state === "idle" && !ghost.speech && Math.random() < 0.4)
  ) {
    ghostSay(pick(STAR_LINES), 2500);
  }
}

// o = the window object from room.js. Drawn BEFORE the frame so the frame sits on top.
function drawWindowSky(ctx, o, now) {
  const gx = o.x + GLASS_INSET.l;
  const gy = o.y + GLASS_INSET.t;
  const gw = o.w - GLASS_INSET.l - GLASS_INSET.r;
  const gh = o.h - GLASS_INSET.t - GLASS_INSET.b;
  if (gw <= 0 || gh <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip(); // nothing below can draw outside the glass

  // sky: flat colour bands instead of a gradient, so it stays pixel art
  ctx.fillStyle = "#171326";
  ctx.fillRect(gx, gy, gw, gh);

  // a few stars, twinkling very gently
  const t = now / 1000;
  for (const s of STARS) {
    ctx.globalAlpha = 0.72 + 0.16 * Math.sin(t * s.speed + s.phase);
    ctx.fillStyle = "#F4EFFB";
    ctx.fillRect(gx + Math.floor(s.u * gw), gy + Math.floor(s.v * gh), 1, 1);
  }
  ctx.globalAlpha = 1;

  // moon
  ctx.fillStyle = "#F3EAD3";
  MOON.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      if (ch === "#") ctx.fillRect(gx + gw - 8 + rx, gy + 2 + ry, 1, 1);
    }),
  );

  // shooting star: a bright head with a fading pink tail, moving down-left
  if (!shootingStar.active && now > nextShootingStar) startShootingStar();
  if (shootingStar.active) {
    const p = (now - shootingStar.startedAt) / shootingStar.duration;
    if (p >= 1) {
      shootingStar.active = false;
    } else {
      const travel = gw + 12;
      const hx = gx + gw + 4 - p * travel;
      const hy = gy + shootingStar.sy * gh + p * travel * 0.5;
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = (1 - i / 6) * (1 - p * 0.4);
        ctx.fillStyle = i === 0 ? "#F4EFFB" : "#D99DB8";
        ctx.fillRect(Math.round(hx + i * 2), Math.round(hy - i), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}
