/* ==========================================================================
   Lightweight canvas charts — no external chart library.
   Reads CSS variables so charts adapt to light/dark automatically.
   ========================================================================== */

const Charts = (() => {
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  function barChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || !data.labels || !data.values) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }
    const { labels, values } = data;
    const { ctx, w, h } = resizeCanvas(canvas);
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 16, right: 8, bottom: 28, left: 8 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const max = Math.max(...values) * 1.2;
    const barGap = chartW / values.length;
    const barWidth = Math.min(36, barGap * 0.5);

    const primary = cssVar('--color-primary') || '#3B82F6';
    const muted = cssVar('--color-text-muted') || '#64748B';
    const border = cssVar('--color-border') || '#E2E8F0';

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();

    values.forEach((v, i) => {
      const barH = (v / max) * chartH;
      const x = padding.left + i * barGap + (barGap - barWidth) / 2;
      const y = padding.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, cssVar('--color-secondary') || '#06B6D4');

      const radius = 6;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.arc(x + barWidth - radius, y + radius, radius, 1.5 * Math.PI, 2 * Math.PI);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = muted;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, padding.top + chartH + 18);
    });
  }

  function donutChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || !data.labels || !data.values) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }
    const { labels, values, colors } = data;
    const { ctx, w, h } = resizeCanvas(canvas);
    ctx.clearRect(0, 0, w, h);

    const total = values.reduce((a, b) => a + b, 0);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 6;
    const innerRadius = radius * 0.62;

    let startAngle = -Math.PI / 2;
    values.forEach((v, i) => {
      const sliceAngle = (v / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      startAngle = endAngle;
    });

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = cssVar('--color-text') || '#0F172A';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 6);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = cssVar('--color-text-muted') || '#64748B';
    ctx.fillText('Total', cx, cy + 14);
  }

  return { barChart, donutChart };
})();
