// admin/js/charts.js - 图表渲染（基于 Canvas API）
const Charts = {
  // 折线图
  line(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const series = options.series || Object.keys(data[0] || {}).filter(k => k !== 'date');
    const labels = data.map(d => d.date?.slice(5) || '');
    const maxVal = Math.max(...data.flatMap(d => series.map(s => d[s] || 0)), 1);

    ctx.clearRect(0, 0, W, H);
    ctx.scale(1, 1);

    // 网格线
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + plotH * i / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      // Y 轴标签
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * (4 - i) / 4), pad.left - 8, y + 4);
    }

    // X 轴标签
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    for (let i = 0; i < labels.length; i += Math.ceil(labels.length / 6)) {
      const x = pad.left + plotW * i / (labels.length - 1 || 1);
      ctx.fillText(labels[i], x, H - pad.bottom + 16);
    }

    // 折线
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
    series.forEach((s, si) => {
      ctx.strokeStyle = colors[si % colors.length];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = pad.left + plotW * i / (data.length - 1 || 1);
        const y = pad.top + plotH * (1 - (d[s] || 0) / maxVal);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 数据点
      data.forEach((d, i) => {
        const x = pad.left + plotW * i / (data.length - 1 || 1);
        const y = pad.top + plotH * (1 - (d[s] || 0) / maxVal);
        ctx.fillStyle = colors[si % colors.length];
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // 图例
    ctx.font = '11px sans-serif';
    series.forEach((s, i) => {
      const x = pad.left + i * 100;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, 4, 12, 12);
      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.fillText(s, x + 16, 14);
    });
  },

  // 柱状图
  bar(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    const maxVal = Math.max(...values, 1);

    ctx.clearRect(0, 0, W, H);

    // 网格
    ctx.strokeStyle = '#eee';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + plotH * i / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }

    // 柱子
    const barW = Math.min(60, plotW / data.length * 0.6);
    const gap = plotW / data.length;
    data.forEach((d, i) => {
      const x = pad.left + gap * i + (gap - barW) / 2;
      const barH = plotH * d.value / maxVal;
      const y = pad.top + plotH - barH;

      const gradient = ctx.createLinearGradient(x, y, x, pad.top + plotH);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barW, barH);

      // 标签
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, H - pad.bottom + 16);

      // 数值
      ctx.fillText(d.value, x + barW / 2, y - 6);
    });
  },

  // 饼图（简单 donut）
  donut(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    const cx = W / 2, cy = H / 2;
    const r = Math.min(cx, cy) - 20, ir = r * 0.55;
    const total = data.reduce((s, d) => s + d.value, 0);

    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#f6d365'];
    let startAngle = -Math.PI / 2;

    data.forEach((d, i) => {
      const sliceAngle = d.value / total * Math.PI * 2;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, ir, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();

      // 标签
      const midAngle = startAngle + sliceAngle / 2;
      const lx = cx + (r + 30) * Math.cos(midAngle);
      const ly = cy + (r + 30) * Math.sin(midAngle);
      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = midAngle > Math.PI / 2 ? 'right' : 'left';
      ctx.fillText(`${d.label} (${Math.round(d.value / total * 100)}%)`, lx, ly);

      startAngle += sliceAngle;
    });
  },
};
