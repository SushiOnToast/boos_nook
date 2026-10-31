const countEl = document.getElementById('count');
const latestEl = document.getElementById('latest');
const statusEl = document.getElementById('status');

function render({ count, latest }) {
  countEl.textContent = `${count} pieces of candy have been left here`;
  if (latest[0]) {
    const name = latest[0].candy_type.replace('_', ' ');
    latestEl.textContent = `someone left a ${name} ${timeAgo(latest[0].created_at)}.`;
  }
}

async function refresh() {
  try { render(await loadBasket()); }
  catch (e) { countEl.textContent = 'the basket is hiding…'; console.error(e); }
}

document.querySelectorAll('[data-candy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      await leaveCandy(btn.dataset.candy);
      statusEl.textContent = 'thank you for being so sweet ♡';
    } catch (e) {
      statusEl.textContent = 'slow down!!';
      console.error(e);
    }
  });
});

refresh();
subscribeToCandy(() => refresh());