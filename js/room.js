const TILE = 16,
  COLS = 12,
  ROWS = 9;
const W = TILE * COLS; // 192 logical pixels
const H = TILE * ROWS; // 144 logical pixels
const WALL_ROWS = 2; // how many tile rows of wall at the top (2 = 32px)

// the canvas always matches the room size
document.getElementById("room").width = W;
document.getElementById("room").height = H;

const DEBUG_HITBOXES = false; // true = draws every clickable box, handy while positioning

// ---- Image loading ----
function loadImg(src, onload) {
  const o = { img: new Image(), ready: false };
  o.img.onload = () => {
    o.ready = true;
    if (onload) onload(o.img);
  };
  o.img.src = src;
  return o;
}

const wallTile = loadImg("assets/room/wall.png");
const floorTile = loadImg("assets/room/floor.png");

const DECOR = [
  {
    id: "rug",
    src: "assets/room/rug.png",
    x: 64,
    y: 64,
    w: 64,
    h: 48,
    color: "#6b4f7d",
  },
];

const OBJECTS = [
  {
    id: "window",
    label: "window",
    src: "assets/room/window.png",
    x: 80,
    y: 6,
    w: 32,
    h: 22,
    color: "#171326",
  },
  {
    id: "bed",
    label: "bed",
    src: "assets/room/bed.png",
    x: 1,
    y: 20,
    w: 32,
    h: 48,
    color: "#D99DB8",
  },
  {
    id: "radio",
    label: "radio",
    src: "assets/room/radio.png",
    x: 160,
    y: 38,
    w: 16,
    h: 16,
    color: "#A99ACF",
  },
  {
    id: "diary",
    label: "diary",
    src: "assets/room/diary.png",
    x: 38,
    y: 58,
    w: 16,
    h: 11,
    color: "#F4EFFB",
  },
  {
    id: "basket",
    label: "candy basket",
    src: "assets/room/basket.png",
    x: 150,
    y: 100,
    w: 16,
    h: 19,
    color: "#e8923a",
  },
];

[...DECOR, ...OBJECTS].forEach((o) => {
  o.sprite = loadImg(o.src, (img) => {
    o.w = img.naturalWidth;
    o.h = img.naturalHeight;
  });
});

// objects lower on screen draw on top of objects higher up
function sortedObjects() {
  return OBJECTS.slice().sort((a, b) => a.y + a.h - (b.y + b.h));
}

// ---- Drawing ----
function drawTiles(ctx) {
  for (let row = 0; row < ROWS; row++) {
    const tile = row < WALL_ROWS ? wallTile : floorTile;
    for (let col = 0; col < COLS; col++) {
      if (tile.ready) {
        ctx.drawImage(tile.img, col * TILE, row * TILE, TILE, TILE);
      } else {
        ctx.fillStyle = row < WALL_ROWS ? "#443858" : "#28213F";
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
  }
}

function drawSprite(ctx, o) {
  if (o.sprite.ready) {
    ctx.drawImage(o.sprite.img, Math.round(o.x), Math.round(o.y));
  } else {
    ctx.fillStyle = o.color;
    ctx.fillRect(o.x, o.y, o.w, o.h);
  }
}

function drawDecor(ctx) {
  DECOR.forEach((o) => drawSprite(ctx, o));
}

// ---- Hover glow: traces the sprite's real shape instead of a box ----
const HOVER_COLOR = "#F4EFFB";
const HOVER_ALPHA = 0.5; // 0-1, lower = more transparent

// a copy of the sprite filled with one flat colour (built once, then reused)
function makeSilhouette(o) {
  const c = document.createElement("canvas");
  c.width = o.sprite.img.naturalWidth;
  c.height = o.sprite.img.naturalHeight;
  const g = c.getContext("2d");
  g.drawImage(o.sprite.img, 0, 0);
  g.globalCompositeOperation = "source-in"; // keeps only the pixels that were drawn
  g.fillStyle = HOVER_COLOR;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawHoverGlow(ctx, o, amount, now) {
  const pulse = 0.85 + 0.15 * Math.sin(now / 250);
  ctx.globalAlpha = HOVER_ALPHA * amount * pulse;

  if (o.sprite.ready) {
    if (!o.silhouette) o.silhouette = makeSilhouette(o);
    const x = Math.round(o.x),
      y = Math.round(o.y);
    // draw the flat-colour copy 1px up/down/left/right: only the edges peek out
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      ctx.drawImage(o.silhouette, x + dx, y + dy);
    }
  } else {
    // sprite not drawn yet: fall back to a box
    ctx.strokeStyle = HOVER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(o.x - 0.5, o.y - 0.5, o.w + 1, o.h + 1);
  }
  ctx.globalAlpha = 1;
}

function drawObjects(ctx, hovered, now) {
  for (const o of sortedObjects()) {
    if (o.id === "window") drawWindowSky(ctx, o, now); // sky goes behind the frame

    // ease the glow in and out instead of snapping
    const target = hovered && hovered.id === o.id ? 1 : 0;
    o.hoverAmt = (o.hoverAmt || 0) + (target - (o.hoverAmt || 0)) * 0.25;
    if (o.hoverAmt > 0.02) drawHoverGlow(ctx, o, o.hoverAmt, now); // behind the sprite

    drawSprite(ctx, o);

    if (DEBUG_HITBOXES) {
      ctx.strokeStyle = "#ff00ff";
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    }
  }
}

function drawRoom(ctx, hovered, now) {
  ctx.clearRect(0, 0, W, H);
  drawTiles(ctx);
  drawDecor(ctx);
  drawObjects(ctx, hovered, now);
  drawGhost(ctx, now);
  drawParticles(ctx, now);
}

// ---- Hit testing ----
function hitTest(x, y) {
  const list = sortedObjects();
  // loop backwards so objects drawn later (on top) win
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
  }
  return null;
}
