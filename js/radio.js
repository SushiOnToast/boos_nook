const STATIONS = [
  {
    name: "GHOST FM",
    freq: 103.1,
    mood: "nostalgic indie",
    playlist: "5Rdaq9DMjCKt3Gh7NzLmTX",
  },
];

const RADIO_LINES_ON = [
  "ooh, i love this one",
  "turn it up. wait, you can't.",
  "my favourite station!",
  "oh! it's my song!",
  "this is what i listen to at 3am.",
  "gerald loves this one too.",
];
const RADIO_LINES_OFF = [
  "aww. i was listening to that.",
  "silence. my old friend.",
  "...it's quiet now.",
];
const RADIO_LINES_LEFT_ON = [
  "you left it on! thank you.",
  "i'd turn it down, but i have no hands.",
  "the music follows me around the room.",
];
// const RADIO_LINES_TUNE = [
//   "ooh, i like this one",
//   "careful with the dial!",
//   "that's Gerald's favourite",
// ];

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
let pendingRadioLine = null; // what the ghost says once you close the radio

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

// brief burst of static, then show/load the station
function staticBurst(ms = 700) {
  staticUntil = performance.now() + ms;
  renderStation();
  radioPlayerEl.innerHTML = ""; // cut the music during the static
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    renderStation();
    loadPlayer();
  }, ms);
}

// ---- Tuning (disabled while there's only one station) ----
// function tune(delta) {
//   stationIdx = (stationIdx + delta + STATIONS.length) % STATIONS.length;
//   if (radioOn) {
//     staticBurst();
//   } else {
//     renderStation(); // tuning while off just moves the needle
//   }
// }

function togglePower() {
  radioOn = !radioOn;
  renderPower();
  if (radioOn) {
    staticBurst(500);
    pendingRadioLine = pick(RADIO_LINES_ON); // said when you close the radio
  } else {
    clearTimeout(loadTimer);
    loadPlayer(); // radioOn is false, so this just empties the player
    pendingRadioLine = pick(RADIO_LINES_OFF);
  }
}

function openRadio() {
  radioOpen = true;
  ghost.cursor = null;
  pendingRadioLine = null;
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

  // the ghost speaks now that the room is visible again
  let line = pendingRadioLine;
  pendingRadioLine = null;
  if (!line && radioOn && Math.random() < 0.5) {
    line = pick(RADIO_LINES_LEFT_ON); // music still playing, you walked away
  }
  if (line) setTimeout(() => ghostSay(line, 3500), 300);
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
// document.getElementById("radio-prev").addEventListener("click", () => tune(-1));
// document.getElementById("radio-next").addEventListener("click", () => tune(1));
radioPowerBtn.addEventListener("click", togglePower);
document.getElementById("radio-close").addEventListener("click", closeRadio);

radioEl.addEventListener("click", (e) => {
  if (e.target === radioEl) closeRadio();
});

document.addEventListener("keydown", (e) => {
  if (!radioOpen) return;
  if (e.key === "Escape") closeRadio();
  // if (e.key === "ArrowRight") tune(1);
  // if (e.key === "ArrowLeft") tune(-1);
});

renderStation();
