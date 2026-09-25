const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif';

const STATES = {
  normal: {
    fill: 'rgba(7, 18, 34, 0.78)',
    border: 'rgba(176, 214, 242, 0.92)',
    text: '#f3f8fd',
    accent: '#8ecae6',
  },
  hover: {
    fill: 'rgba(14, 42, 74, 0.92)',
    border: '#d7f1ff',
    text: '#ffffff',
    accent: '#bfe7ff',
  },
  active: {
    fill: 'rgba(54, 40, 14, 0.94)',
    border: '#f2d48a',
    text: '#fff8ea',
    accent: '#f2d48a',
  },
  related: {
    fill: 'rgba(10, 36, 64, 0.9)',
    border: 'rgba(214, 236, 255, 0.96)',
    text: '#ffffff',
    accent: '#d6ecff',
  },
  dim: {
    fill: 'rgba(6, 12, 22, 0.42)',
    border: 'rgba(150, 176, 198, 0.28)',
    text: 'rgba(226, 236, 244, 0.38)',
    accent: 'rgba(150, 176, 198, 0.28)',
  },
};

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function createLabelTexture(text, stateName, { circular = false } = {}) {
  const state = STATES[stateName] ?? STATES.normal;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = circular ? 72 : 56;
  ctx.font = `600 ${fontSize}px ${FONT}`;
  const textWidth = Math.ceil(ctx.measureText(text).width);
  const padX = circular ? 36 : 44;
  const width = Math.max(circular ? 280 : 220, textWidth + padX * 2);
  const height = circular ? width : 112;
  const ratio = 2;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.font = `600 ${fontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (circular) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width / 2 - 8, 0, Math.PI * 2);
    ctx.fillStyle = state.fill;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = state.border;
    ctx.stroke();
  } else {
    roundRect(ctx, 4, 8, width - 8, height - 16, (height - 16) / 2);
    ctx.fillStyle = state.fill;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = state.border;
    ctx.stroke();
    ctx.fillStyle = state.accent;
    roundRect(ctx, 18, height / 2 - 16, 8, 32, 4);
    ctx.fill();
  }

  ctx.fillStyle = state.text;
  ctx.fillText(text, width / 2 + (circular ? 0 : 6), height / 2 + 1);

  return { canvas, aspect: width / height };
}
