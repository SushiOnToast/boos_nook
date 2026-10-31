function pixelArt(rows, scale = 7, color = "#3a2f45") {
  const w = rows[0].length,
    h = rows.length;
  let rects = "";
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "#") rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" fill="${color}" shape-rendering="crispEdges">${rects}</svg>`;
}

// diary entries
const DIARY = [
  {
    date: "October 24",
    title: "I have no reflection",
    text: "Checked the mirror again today. Nothing. I waved at it for ten minutes in case it was shy.",
  },
  {
    date: "October 25",
    title: "A very strange cat",
    text: "A cat sat on the windowsill and stared at me for an hour. It could definitely see me. It was not impressed. I offered it a biscuit but my hand went through the biscuit. We both pretended that didn't happen.",
  },
  {
    date: "October 26",
    title: "The glowing rectangle",
    text: "People keep appearing in my room through a glowing rectangle. They look around, click on things, and leave. I think they are very polite burglars. Nothing has been stolen. I've started tidying for them.",
  },
  {
    date: "October 27",
    title: "My favourite cloud",
    text: "There's a cloud outside shaped like a wonky donut. I've named him Gerald. He's been there three nights now. I think we're friends.",
  },
  {
    date: "October 28",
    title: "A self-portrait",
    text: "Since I have no reflection I drew myself from memory. Everyone says it looks just like me!!!",
    art: pixelArt([
      "....######....",
      "...#......#...",
      "..#........#..",
      "..#..##..#..#.",
      "..#..##..#..#.",
      ".#..........#.",
      ".#..#....#..#.",
      ".#...####...#.",
      ".#..........#.",
      "#...........#.",
      "#...........#.",
      "#...........#.",
      "#..#...#....#.",
      "#.#.#.#.#.#.#.",
      ".#...#...#.#..",
    ]),
  },
  {
    date: "October 29",
    title: "I miss having pockets",
    text: "Where does a ghost keep things? Nowhere. That's where. I hid a coin inside the radio and it has rattled around in there for a week.",
  },
  {
    date: "October 30",
    title: "Someone left candy",
    text: "There was a sweet in my basket this morning. I didn't put it there. Then another one. Then another. I think the rectangle people are sneaking them in. I can't eat them but I've been counting :).",
  },
  {
    date: "October 31",
    title: "A visitor!",
    text: "Tonight is Halloween, which is basically my birthday if I could remember when my birthday is. Someone is visiting right now! If that's you: hi. I'm not nervous. You're nervous.",
  },
];

// what the ghost says when you close the diary
const DIARY_CLOSE_LINES = [
  "you weren't supposed to read that one.",
  "...so. how much did you read?",
  "that's private. but fine.",
  "gerald says hi.",
  "i was going to cross some of that out.",
];

const diaryEl = document.getElementById("diary");
const pageEl = document.getElementById("diary-page");
const dateEl = document.getElementById("diary-date");
const titleEl = document.getElementById("diary-title");
const artEl = document.getElementById("diary-art");
const bodyEl = document.getElementById("diary-body");
const numEl = document.getElementById("diary-num");
const prevBtn = document.getElementById("diary-prev");
const nextBtn = document.getElementById("diary-next");

let diaryPage = 0;
let diaryOpen = false;

function renderPage() {
  const e = DIARY[diaryPage];
  dateEl.textContent = e.date;
  titleEl.textContent = e.title;
  bodyEl.textContent = e.text;
  artEl.innerHTML = e.art || "";
  numEl.textContent = `${diaryPage + 1} / ${DIARY.length}`;
  prevBtn.disabled = diaryPage === 0;
  nextBtn.disabled = diaryPage === DIARY.length - 1;
}

function turnTo(n) {
  if (n < 0 || n >= DIARY.length) return;
  diaryPage = n;
  renderPage();
}

function openDiary() {
  diaryOpen = true;
  ghost.cursor = null; // so the ghost doesn't say "leaving already?" when the overlay covers the room
  diaryPage = 0;
  renderPage();
  diaryEl.hidden = false;
}

function closeDiary() {
  if (!diaryOpen) return;
  diaryOpen = false;
  diaryEl.hidden = true;
  ghostSay(pick(DIARY_CLOSE_LINES), 3500);
}

// ---- Controls ----
prevBtn.addEventListener("click", () => turnTo(diaryPage - 1));
nextBtn.addEventListener("click", () => turnTo(diaryPage + 1));
document.getElementById("diary-close").addEventListener("click", closeDiary);

// clicking the dark background closes it
diaryEl.addEventListener("click", (e) => {
  if (e.target === diaryEl) closeDiary();
});

// keyboard: arrows to turn pages, Escape to close
document.addEventListener("keydown", (e) => {
  if (!diaryOpen) return;
  if (e.key === "Escape") closeDiary();
  if (e.key === "ArrowRight") turnTo(diaryPage + 1);
  if (e.key === "ArrowLeft") turnTo(diaryPage - 1);
});
