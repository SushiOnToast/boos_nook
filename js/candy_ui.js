// ---- The treats ----
// color = placeholder until assets/candy/<id>.png exists
// reaction = which ghost state it triggers
const CANDIES = [
  {
    id: "cherry",
    name: "cherry",
    color: "#d6224a",
    reaction: "surprised",
    lines: [
      "a cherry?! ...is someone chasing me?",
      "wakka wakka... oh no.",
      "this is how it starts. first the cherry...",
    ],
  },
  {
    id: "orange",
    name: "orange",
    color: "#f08a24",
    reaction: "happy",
    lines: [
      "an orange. basically a tiny pumpkin.",
      "a healthy one! i respect the bravery.",
      "vitamin c! i have no use for it. thank you!",
    ],
  },
  {
    id: "booberry_kiss",
    name: "booberry kiss",
    color: "#c06bd6",
    reaction: "happy",
    lines: [
      "oh. oh my. *blushes*",
      "a kiss?? for me??",
      "i'm not blushing. ghosts can't blush.",
    ],
  },
  {
    id: "bat_lolly",
    name: "bat lolly",
    color: "#5a4a78",
    reaction: "happy",
    lines: [
      "i'm not batman. but i'll take it.",
      "a bat lolly! very dramatic.",
      "i shall guard this with my life. er. afterlife.",
    ],
  },
  {
    id: "shooting_star",
    name: "shooting star",
    color: "#fff1a8",
    reaction: "happy",
    lines: [
      "a whole star?! quick, make a wish!",
      "i'll put it on the windowsill.",
      "i wished for more candy. too greedy?",
    ],
  },
  {
    id: "candy_corn",
    name: "candy corn",
    color: "#f2c14e",
    reaction: "happy",
    lines: [
      "candy corn. ...classic.",
      "meh. i mean, thank you!",
      "everyone hates candy corn. i don't. i'm brave.",
    ],
  },
];

const COOLDOWN_MS = 60 * 1000; // keep in sync with the SQL trigger interval

const CANDY_BY_ID = {};
CANDIES.forEach((c) => {
  CANDY_BY_ID[c.id] = c;
  c.ready = false;
  c.img = new Image();
  c.img.onload = () => {
    c.ready = true; // real art found: use it instead of the colour block
    drawPickerSwatches();
    renderCandyWindow();
  };
  c.img.src = `assets/candy/${c.id}.png`; // a 404 here just means "still using placeholders"
});

// ---- Drawing one candy (used by the room, the pile and the picker) ----
function drawCandy(ctx, id, x, y, size) {
  const c = CANDY_BY_ID[id];
  ctx.imageSmoothingEnabled = false;
  if (c && c.ready) {
    ctx.drawImage(c.img, x, y, size, size);
    return;
  }
  ctx.fillStyle = c ? c.color : "#888";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.35)"; // tiny highlight so it reads as an object
  const h = Math.max(1, Math.floor(size / 4));
  ctx.fillRect(x + 1, y + 1, h, h);
}

// ---- State ----
const basketState = { count: null, latest: [], error: false };
let candyOpen = false;
let selectedCandy = null;
let candyLeaving = false;
let candyTick = null;

// ---- Elements ----
const candyEl = document.getElementById("candy");
const candyCountEl = document.getElementById("candy-count");
const candyLatestEl = document.getElementById("candy-latest");
const candyPileEl = document.getElementById("candy-pile");
const candyPickerEl = document.getElementById("candy-picker");
const candyLeaveBtn = document.getElementById("candy-leave");
const candyStatusEl = document.getElementById("candy-status");
const pileCtx = candyPileEl.getContext("2d");

// ---- Helpers ----
function candyPhrase(id) {
  const c = CANDY_BY_ID[id];
  const n = c ? c.name : "treat";
  return (/^[aeiou]/i.test(n) ? "an " : "a ") + n;
}

function cooldownLeft() {
  try {
    const last = Number(localStorage.getItem("lh_last_candy") || 0);
    return Math.max(0, last + COOLDOWN_MS - Date.now());
  } catch (e) {
    return 0;
  }
}
function startCooldown() {
  try {
    localStorage.setItem("lh_last_candy", String(Date.now()));
  } catch (e) {}
}

// ---- Data ----
async function refreshBasket() {
  try {
    const { count, latest } = await loadBasket(30);
    basketState.count = count;
    basketState.latest = latest;
    basketState.error = false;
  } catch (e) {
    basketState.error = true;
    console.error(e);
  }
  renderCandyWindow();
}

// ---- The pile in the room, drawn on the main canvas (called from drawRoom) ----
const BASKET_CANDY = 6; // size of each candy in the room, logical px
const BASKET_SLOTS = [
  [1, 1],
  [7, 1],
  [13, 1],
  [4, 7],
  [10, 7],
  [1, 13],
  [7, 13],
  [13, 13],
];
function drawBasketCandy(ctx) {
  const b = OBJECTS.find((o) => o.id === "basket");
  if (!b) return;
  const n = Math.min(basketState.latest.length, BASKET_SLOTS.length);
  for (let i = n - 1; i >= 0; i--) {
    // oldest first, newest ends up on top
    const [sx, sy] = BASKET_SLOTS[i];
    drawCandy(
      ctx,
      basketState.latest[i].candy_type,
      b.x + sx,
      b.y + sy,
      BASKET_CANDY,
    );
  }
}

// ---- The window ----
function drawPile() {
  pileCtx.clearRect(0, 0, 128, 40);
  const COLS = 10,
    TILE = 12;
  basketState.latest.slice(0, 30).forEach((row, i) => {
    drawCandy(
      pileCtx,
      row.candy_type,
      4 + (i % COLS) * TILE,
      2 + Math.floor(i / COLS) * TILE,
      10,
    );
  });
}

function drawPickerSwatches() {
  candyPickerEl.querySelectorAll(".candy-opt").forEach((btn) => {
    const ctx = btn.querySelector("canvas").getContext("2d");
    ctx.clearRect(0, 0, 16, 16);
    drawCandy(ctx, btn.dataset.candy, 0, 0, 16);
  });
}

function markSelected() {
  candyPickerEl.querySelectorAll(".candy-opt").forEach((btn) => {
    btn.classList.toggle("sel", btn.dataset.candy === selectedCandy);
  });
}

function updateLeaveButton() {
  const left = cooldownLeft();
  if (candyLeaving) {
    candyLeaveBtn.disabled = true;
    candyLeaveBtn.textContent = "leaving...";
  } else if (left > 0) {
    candyLeaveBtn.disabled = true;
    candyLeaveBtn.textContent = `the ghost is full (${Math.ceil(left / 1000)}s)`;
  } else {
    candyLeaveBtn.disabled = !selectedCandy;
    candyLeaveBtn.textContent = "leave a treat";
  }
}

function renderCandyWindow() {
  const n = basketState.count;
  if (basketState.error) {
    candyCountEl.textContent = "the basket is hiding...";
    candyLatestEl.textContent = "";
  } else if (n === null) {
    candyCountEl.textContent = "counting the candy...";
    candyLatestEl.textContent = "";
  } else if (n === 0) {
    candyCountEl.textContent = "the basket is empty. be the first!";
    candyLatestEl.textContent = "";
  } else {
    candyCountEl.textContent = `${n} piece${n === 1 ? "" : "s"} of candy ${n === 1 ? "has" : "have"} been left here.`;
    const last = basketState.latest[0];
    candyLatestEl.textContent = last
      ? `someone left ${candyPhrase(last.candy_type)} ${timeAgo(last.created_at)}.`
      : "";
  }
  drawPile();
  updateLeaveButton();
}

function openCandy() {
  candyOpen = true;
  ghost.cursor = null;
  selectedCandy = null;
  candyStatusEl.textContent = "";
  markSelected();
  renderCandyWindow();
  candyEl.hidden = false;
  clearInterval(candyTick);
  candyTick = setInterval(updateLeaveButton, 1000); // counts the cooldown down
  refreshBasket(); // always show the freshest numbers
}

function closeCandy() {
  if (!candyOpen) return;
  candyOpen = false;
  candyEl.hidden = true;
  clearInterval(candyTick);
}

// ---- Leaving a treat ----
function ghostReactToCandy(id) {
  const c = CANDY_BY_ID[id];
  if (!c) return;
  ghost.lastInteraction = performance.now();
  setState(c.reaction, 3500);
  ghostSay(pick(c.lines), 3500);
}

async function onLeaveClick() {
  if (!selectedCandy || candyLeaving || cooldownLeft() > 0) return;
  const id = selectedCandy;
  candyLeaving = true;
  updateLeaveButton();
  try {
    await leaveCandy(id);
    startCooldown();
    selectedCandy = null;
    markSelected();
    candyStatusEl.textContent = "thank you for being so sweet <3";
    await refreshBasket();
    // let the thank-you show for a moment, then reveal the room and the ghost's reaction
    setTimeout(() => {
      closeCandy();
      ghostReactToCandy(id);
    }, 1100);
  } catch (e) {
    console.error(e);
    if (String(e.message || "").includes("slow down")) {
      startCooldown();
      candyStatusEl.textContent = "the ghost says: slow down a little.";
    } else {
      candyStatusEl.textContent = "the basket wobbled. try again?";
    }
  }
  candyLeaving = false;
  updateLeaveButton();
}

// ---- Setup ----
CANDIES.forEach((c) => {
  const btn = document.createElement("button");
  btn.className = "candy-opt";
  btn.dataset.candy = c.id;
  const cv = document.createElement("canvas");
  cv.width = 16;
  cv.height = 16;
  const label = document.createElement("span");
  label.textContent = c.name;
  btn.append(cv, label);
  btn.addEventListener("click", () => {
    selectedCandy = c.id;
    candyStatusEl.textContent = "";
    markSelected();
    updateLeaveButton();
  });
  candyPickerEl.appendChild(btn);
});
drawPickerSwatches();

candyLeaveBtn.addEventListener("click", onLeaveClick);
document.getElementById("candy-close").addEventListener("click", closeCandy);
candyEl.addEventListener("click", (e) => {
  if (e.target === candyEl) closeCandy();
});
document.addEventListener("keydown", (e) => {
  if (candyOpen && e.key === "Escape") closeCandy();
});

// ---- Live updates ----
refreshBasket();
subscribeToCandy((row) => {
  refreshBasket();
  // if it was someone else, the ghost sometimes mentions it
  if (
    row.visitor_id !== getVisitorId() &&
    !candyOpen &&
    ghost.state === "idle"
  ) {
    if (Math.random() < 0.6)
      ghostSay(`ooh, someone left ${candyPhrase(row.candy_type)}!`, 3000);
  }
});
