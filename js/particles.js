const MOTES = [];
for (let i = 0; i < 18; i++) {
  MOTES.push({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 2,
    vy: -(2 + Math.random() * 4), // drifts upward, slowly
    sway: 0.5 + Math.random(),
    twinkle: 0.8 + Math.random() * 1.5,
    phase: Math.random() * 6.28,
    color: Math.random() < 0.3 ? "#D99DB8" : "#A99ACF",
  });
}

let lastMoteTime = 0;

function drawParticles(ctx, now) {
  const dt = Math.min((now - (lastMoteTime || now)) / 1000, 0.05);
  lastMoteTime = now;
  const t = now / 1000;

  for (const m of MOTES) {
    m.y += m.vy * dt;
    m.x += (m.vx + Math.sin(t * m.sway + m.phase) * 2) * dt;
    if (m.y < -2) { m.y = H + 2; m.x = Math.random() * W; } // wrap round
    if (m.x < -2) m.x = W + 2;
    if (m.x > W + 2) m.x = -2;

    ctx.globalAlpha = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * m.twinkle + m.phase));
    ctx.fillStyle = m.color;
    ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
  }
  ctx.globalAlpha = 1;
}