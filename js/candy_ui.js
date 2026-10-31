// ---- The treats ----
// color = placeholder used only if assets/candy/<id>.png is missing
// reaction = which ghost state it triggers
const CANDIES = [
  {
    id: "cherry",
    name: "cherry",
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
  new Image().src = `assets/candy/${c.id}.png`; // preload so the cards appear instantly
});

// one candy as an image element
function candyThumb(id) {
  const c = CANDY_BY_ID[id];
  const img = document.createElement("img");
  img.src = `assets/candy/${id}.png`;
  img.alt = c ? c.name : "candy";
  img.className = "thumb";
  return img;
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
const candyGalleryEl = document.getElementById("candy-gallery");
const candyPickerEl = document.getElementById("candy-picker");
const candyLeaveBtn = document.getElementById("candy-leave");
const candyStatusEl = document.getElementById("candy-status");
const candyMyNameEl = document.getElementById("candy-myname");

// ---- Helpers ----
function candyPhrase(id) {
  const c = CANDY_BY_ID[id];
  const n = c ? c.name : "treat";
  return (/^[aeiou]/i.test(n) ? "an " : "a ") + n;
}

// "sleepy moth", or "someone" for old rows without a name
function rowName(row) {
  return row.name_adj && row.name_noun
    ? `${row.name_adj} ${row.name_noun}`
    : "someone";
}

function showMyName() {
  const n = getVisitorName();
  candyMyNameEl.textContent = `${n.adj} ${n.noun}`;
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

// ---- Rendering ----
function renderGallery() {
  candyGalleryEl.replaceChildren();
  if (!basketState.latest.length) {
    const empty = document.createElement("div");
    empty.className = "candy-empty";
    empty.textContent = "nothing here yet...";
    candyGalleryEl.appendChild(empty);
    return;
  }
  const mineIds = new Set(getMyCandyIds());
  basketState.latest.forEach((row) => {
    const mine = mineIds.has(row.id);
    const card = document.createElement("div");
    card.className = "candy-card" + (mine ? " mine" : "");
    card.title = `${candyPhrase(row.candy_type)}, ${timeAgo(row.created_at)}`;
    const label = document.createElement("span");
    label.textContent = mine ? "you" : rowName(row);
    card.append(candyThumb(row.candy_type), label);
    candyGalleryEl.appendChild(card);
  });
}

function renderPicker() {
  candyPickerEl.querySelectorAll(".candy-opt").forEach((btn) => {
    btn.querySelector(".slot").replaceChildren(candyThumb(btn.dataset.candy));
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
    if (last) {
      const who = getMyCandyIds().includes(last.id) ? "you" : rowName(last);
      candyLatestEl.textContent = `${who} left ${candyPhrase(last.candy_type)} ${timeAgo(last.created_at)}.`;
    } else {
      candyLatestEl.textContent = "";
    }
  }
  renderGallery();
  updateLeaveButton();
}

// ---- Open / close ----
function openCandy() {
  candyOpen = true;
  ghost.cursor = null;
  selectedCandy = null;
  candyStatusEl.textContent = "";
  markSelected();
  showMyName();
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
  const slot = document.createElement("div");
  slot.className = "slot";
  const label = document.createElement("span");
  label.textContent = c.name;
  btn.append(slot, label);
  btn.addEventListener("click", () => {
    selectedCandy = c.id;
    candyStatusEl.textContent = "";
    markSelected();
    updateLeaveButton();
  });
  candyPickerEl.appendChild(btn);
});
renderPicker();

document.getElementById("candy-reroll").addEventListener("click", () => {
  rerollVisitorName();
  showMyName();
});
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
    if (Math.random() < 0.6) {
      ghostSay(
        `ooh, ${rowName(row)} left ${candyPhrase(row.candy_type)}!`,
        3000,
      );
    }
  }
});
