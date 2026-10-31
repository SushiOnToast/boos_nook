const TILE = 16,
  COLS = 16,
  ROWS = 12;
const W = TILE * COLS; // 256 logical pixels
const H = TILE * ROWS; // 192 logical pixels
const WALL_ROWS = 2; // how many tile rows of wall at the top (2 = 32px)

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

// ---- Decoration: drawn but not clickable (rug, posters, etc.) ----
// x, y = top-left corner in logical pixels. w, h = fallback size until the image loads.
const DECOR = [
  {
    id: "rug",
    src: "assets/room/rug.png",
    x: 96,
    y: 84,
    w: 64,
    h: 48,
    color: "#6b4f7d",
  },
];

// ---- Interactive objects: hover outline + clicks ----
const OBJECTS = [
  {
    id: "window",
    label: "the window",
    src: "assets/room/window.png",
    x: 112,
    y: 6,
    w: 32,
    h: 22,
    color: "#171326",
  },
  {
    id: "bed",
    label: "the bed",
    src: "assets/room/bed.png",
    x: 0,
    y: 20,
    w: 32,
    h: 48,
    color: "#D99DB8",
  },
  {
    id: "radio",
    label: "the radio",
    src: "assets/room/radio.png",
    x: 200,
    y: 40,
    w: 16,
    h: 16,
    color: "#A99ACF",
  },
  {
    id: "diary",
    label: "the diary",
    src: "assets/room/diary.png",
    x: 200,
    y: 100,
    w: 16,
    h: 11,
    color: "#F4EFFB",
  },
  {
    id: "basket",
    label: "the candy basket",
    src: "assets/room/basket.png",
    x: 120,
    y: 144,
    w: 16,
    h: 19,
    color: "#e8923a",
  },
];

// once a sprite loads, its real size replaces the fallback size
// (this is also what makes the clickable area match your drawing)
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

function drawObjects(ctx, hovered) {
  for (const o of sortedObjects()) {
    drawSprite(ctx, o);

    if (hovered && hovered.id === o.id) {
      ctx.strokeStyle = "#F4EFFB";
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x - 0.5, o.y - 0.5, o.w + 1, o.h + 1);
    }
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
  drawObjects(ctx, hovered);
  drawGhost(ctx, now);
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
