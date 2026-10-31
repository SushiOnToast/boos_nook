const TILE = 16,
  COLS = 16,
  ROWS = 12;
const W = TILE * COLS; // 256 logical pixels
const H = TILE * ROWS; // 192 logical pixels
const SPACING = 0; // gap between tiles in the sheet, if any

// optional Tileset, falls back to colour blocks if not there
const tileset = new Image();
let tilesetReady = false;
tileset.onload = () => {
  tilesetReady = true;
};
tileset.src = "assets/tileset/tiles.png";

// one char = one tile
// W = wall, F = floor, R = rug
const MAP = [
  "WWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWW",
  "FFFFFFFFFFFFFFFF",
  "FFFFFFFFFFFFFFFF",
  "FFFFFFFFFFFFFFFF",
  "FFFFFFRRRRFFFFFF",
  "FFFFFFRRRRFFFFFF",
  "FFFFFFRRRRFFFFFF",
  "FFFFFFFFFFFFFFFF",
  "FFFFFFFFFFFFFFFF",
  "FFFFFFFFFFFFFFFF",
  "FFFFFFFFFFFFFFFF",
];

// col, row coordinates of tile in tilset
// color = placeholder used until then.
const TILE_DEFS = {
  W: { color: "#443858", src: null }, // e.g. src: [3, 0]
  F: { color: "#28213F", src: null },
  R: { color: "#6b4f7d", src: null },
};

// object coords
const OBJECTS = [
  {
    id: "window",
    label: "my window",
    x: 112,
    y: 6,
    w: 32,
    h: 22,
    color: "#171326",
  },
  {
    id: "bed",
    label: "my bed :)",
    x: 16,
    y: 44,
    w: 48,
    h: 32,
    color: "#D99DB8",
  },
  {
    id: "radio",
    label: "my radio",
    x: 200,
    y: 40,
    w: 16,
    h: 16,
    color: "#A99ACF",
  },
  {
    id: "diary",
    label: "my diary",
    x: 200,
    y: 100,
    w: 16,
    h: 16,
    color: "#F4EFFB",
  },
  {
    id: "basket",
    label: "my candy basket",
    x: 120,
    y: 144,
    w: 20,
    h: 20,
    color: "#e8923a",
  },
];

// drawing
function drawTiles(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const def = TILE_DEFS[MAP[row][col]];
      const dx = col * TILE,
        dy = row * TILE;
      if (tilesetReady && def.src) {
        const sx = def.src[0] * (TILE + SPACING);
        const sy = def.src[1] * (TILE + SPACING);
        ctx.drawImage(tileset, sx, sy, TILE, TILE, dx, dy, TILE, TILE);
      } else {
        ctx.fillStyle = def.color;
        ctx.fillRect(dx, dy, TILE, TILE);
      }
    }
  }
}

function drawObjects(ctx, hovered) {
  for (const o of OBJECTS) {
    // Later: if (o.sprite) ctx.drawImage(o.sprite, o.x, o.y)
    ctx.fillStyle = o.color;
    ctx.fillRect(o.x, o.y, o.w, o.h);

    if (hovered && hovered.id === o.id) {
      ctx.strokeStyle = "#F4EFFB";
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x - 0.5, o.y - 0.5, o.w + 1, o.h + 1);
    }
  }
}

function drawRoom(ctx, hovered, now) {
  ctx.clearRect(0, 0, W, H);
  drawTiles(ctx);
  drawObjects(ctx, hovered);
  drawBasketCandy(ctx);
  drawGhost(ctx, now);
}

// test hit
function hitTest(x, y) {
  // Loop backwards so objects drawn later (on top) win
  for (let i = OBJECTS.length - 1; i >= 0; i--) {
    const o = OBJECTS[i];
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
  }
  return null;
}
