// ---- Stations ----
// The playlist IDs below are Spotify's own playlists, used as stand-ins.
// To use yours: open a playlist in Spotify > Share > Copy link.
// The ID is the part after /playlist/ and before the "?".
const STATIONS = [
  {
    name: "GHOST FM",
    freq: 103.1,
    mood: "nostalgic indie",
    playlist: "5Rdaq9DMjCKt3Gh7NzLmTX",
  },
//   {
//     name: "AFTER HOURS",
//     freq: 94.7,
//     mood: "dreamy and melancholic",
//     playlist: "37i9dQZF1DX3Ogo9pFvBkY",
//   },
//   {
//     name: "THE VOID",
//     freq: 88.3,
//     mood: "eerie ambient sounds",
//     playlist: "37i9dQZF1DWZd79rJ6a7lp",
//   },
//   {
//     name: "BEDTIME RADIO",
//     freq: 107.9,
//     mood: "soft, cozy instrumentals",
//     playlist: "37i9dQZF1DX4sWSpwq3LiO",
//   },
];

const RADIO_LINES_ON = [
  "ooh, i love this one",
  "turn it up. wait, you can't.",
  "my favourite station!",
];
const RADIO_LINES_TUNE = [
  "ooh, i like this one",
  "careful with the dial!",
  "that's Gerald's favourite",
];

// ---- Elements ----
const radioEl = document.getElementById("radio");
const radioNameEl = document.getElementById("radio-name");
const radioFreqEl = document.getElementById("radio-freq");
const radioMoodEl = document.getElementById("radio-mood");
const radioNeedleEl = document.getElementById("radio-needle");
const radioPlayerEl = document.getElementById("radio-player");
const radioHintEl = document.getElementById("radio-hint");
const radioPowerBtn = document.getElementById("radio-power");
const visCanvas = document.getElementById("radio-vis");
const visCtx = visCanvas.getContext("2d");

// ---- State ----
let radioOpen = false;
let radioOn = false;
let stationIdx = 0;
let staticUntil = 0; // timestamp: while now < this, show static
let loadTimer = null;

// ---- Display ----
function renderStation(now = performance.now()) {
  const s = STATIONS[stationIdx];
  radioNameEl.textContent = now < staticUntil ? "...static..." : s.name;
  radioFreqEl.textContent = s.freq.toFixed(1);
  radioMoodEl.textContent = s.mood;
  // needle position along an 88-108 dial
  radioNeedleEl.style.left = ((s.freq - 88) / (108 - 88)) * 100 + "%";
}

function renderPower() {
  radioPowerBtn.classList.toggle("on", radioOn);
  radioPowerBtn.textContent = radioOn ? "power: on" : "power: off";
  radioHintEl.textContent = radioOn
    ? "press play on the player above ^"
    : "the radio is off. press power.";
}

// ---- Spotify player ----
// Removing the iframe is what actually stops the music.
function loadPlayer() {
  radioPlayerEl.innerHTML = "";
  if (!radioOn) return;
  const iframe = document.createElement("iframe");
  iframe.src = `https://open.spotify.com/embed/playlist/${STATIONS[stationIdx].playlist}?utm_source=generator&theme=0`;
  iframe.allow =
    "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  iframe.loading = "lazy";
  radioPlayerEl.appendChild(iframe);
}

// brief burst of static, then show/load the new station
function staticBurst(ms = 700) {
  staticUntil = performance.now() + ms;
  renderStation();
  radioPlayerEl.innerHTML = ""; // cut the music while "tuning"
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    renderStation();
    loadPlayer();
  }, ms);
}

function tune(delta) {
  stationIdx = (stationIdx + delta + STATIONS.length) % STATIONS.length;
  if (radioOn) {
    staticBurst();
    if (Math.random() < 0.3) ghostSay(pick(RADIO_LINES_TUNE), 2500);
  } else {
    renderStation(); // tuning while off just moves the needle
  }
}

function togglePower() {
  radioOn = !radioOn;
  renderPower();
  if (radioOn) {
    staticBurst(500);
    ghostSay(pick(RADIO_LINES_ON), 2500);
  } else {
    clearTimeout(loadTimer);
    loadPlayer(); // radioOn is false, so this just empties the player
  }
}

// ---- Open / close ----
// Closing the window does NOT stop the music: the iframe stays in the page,
// just hidden. Only "power: off" stops it.
function openRadio() {
  radioOpen = true;
  ghost.cursor = null;
  renderStation();
  renderPower();
  radioEl.hidden = false;
  if (!visRunning) {
    visRunning = true;
    requestAnimationFrame(drawVis);
  }
}

function closeRadio() {
  if (!radioOpen) return;
  radioOpen = false;
  radioEl.hidden = true;
}

// ---- Visualiser (simulated bars) ----
const BARS = 32;
const SEG = 3; // each LED segment = 2px tall + 1px gap
const barLevel = new Array(BARS).fill(0);
const barTarget = new Array(BARS).fill(0);
let nextBarChange = 0;
let visRunning = false;

function drawVis(now) {
  if (!radioOpen) {
    visRunning = false;
    return;
  }

  const noisy = now < staticUntil;
  if (now > nextBarChange) {
    nextBarChange = now + (noisy ? 50 : 130);
    for (let i = 0; i < BARS; i++) {
      if (noisy) barTarget[i] = Math.random() * 8;
      else if (radioOn) barTarget[i] = 1 + Math.random() * 5;
      else barTarget[i] = 0;
    }
  }

  visCtx.clearRect(0, 0, 128, 24);
  for (let i = 0; i < BARS; i++) {
    barLevel[i] += (barTarget[i] - barLevel[i]) * 0.3;
    const segs = Math.round(barLevel[i]);
    if (segs === 0) {
      // dim baseline so the display never looks empty
      visCtx.fillStyle = "#443858";
      visCtx.fillRect(i * 4, 22, 3, 2);
    }
    for (let s = 0; s < segs; s++) {
      visCtx.fillStyle = s === segs - 1 ? "#D99DB8" : "#A99ACF";
      visCtx.fillRect(i * 4, 24 - (s + 1) * SEG + 1, 3, 2);
    }
  }
  requestAnimationFrame(drawVis);
}

// ---- Controls ----
document.getElementById("radio-prev").addEventListener("click", () => tune(-1));
document.getElementById("radio-next").addEventListener("click", () => tune(1));
radioPowerBtn.addEventListener("click", togglePower);
document.getElementById("radio-close").addEventListener("click", closeRadio);

radioEl.addEventListener("click", (e) => {
  if (e.target === radioEl) closeRadio();
});

document.addEventListener("keydown", (e) => {
  if (!radioOpen) return;
  if (e.key === "Escape") closeRadio();
  if (e.key === "ArrowRight") tune(1);
  if (e.key === "ArrowLeft") tune(-1);
});

renderStation();
