const FONT_SIZE = 18;        // px, one size for every character on the grid
const LINE_HEIGHT = 1.2;     // cell height = FONT_SIZE * LINE_HEIGHT
const TEXT_GAP = 1;          // cells on every side of text; the outermost ring keeps half its dots
const MAX_DT = 0.05;         // s, clamp for frame time after tab switches
const FADE_ROWS = 6;         // rows the scene runs on below the screen, fading out into the page

// Braille dot bits (U+2800 + bits), grouped by the half of the cell they sit in.
const TOP = 0x1b;            // dots 1 2 4 5
const BOTTOM = 0xe4;         // dots 3 6 7 8
const LEFT = 0x47;           // dots 1 2 3 7
const RIGHT = 0xb8;          // dots 4 5 6 8

// Bit of the braille dot at (dx, dy) inside a cell: DOT_BIT[dy][dx], dx 0..1, dy 0..3.
const DOT_BIT = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];

const hero = document.querySelector('.hero');
const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');

// Scene layers, each from its own script: { resize(frame), update(frame, dt, t), draw(frame) }.
// Every frame all layers update in this order, then all draw in this order.
const layers = [Ripples, Fish, Water];

// Shared state handed to layers. Positions are in dots: one cell is 2 dots wide, 4 tall.
const frame = {
  cols: 0, rows: 0,          // grid size in cells
  w: 0, h: 0,                // grid size in dots
  dots: null,                // Uint8Array(w * h), 1 = dot on; cleared every frame
  ink: null,                 // Uint8Array(cols * rows), palette index per cell; reset to 0 every frame
  ripple: null,              // Float32Array(w * h), water surface height, about -1..1, 0 = calm; written by Ripples
  rippleCalm: true,          // true while ripple is all zeros, so layers can skip reading it
  // In dots. moved: a mouse or pen moved since last frame; tapped: a finger tapped since last frame.
  pointer: { x: 0, y: 0, inside: false, moved: false, tapped: false },
  palette: [],               // colors by ink index; 0 is --main
  // Ink index for a color, either a CSS color or a CSS variable name like '--secondary'.
  color(c) {
    if (c.startsWith('--')) c = getComputedStyle(document.documentElement).getPropertyValue(c).trim();
    let i = this.palette.indexOf(c);
    if (i < 0) i = this.palette.push(c) - 1;
    return i;
  },
};

let grid = null;             // layout of the current size, rebuilt on resize
let atlases = new Map();     // color -> canvas with all 256 braille glyphs side by side (water color only)

// Text lines placed on the grid: centered horizontally plus a column shift, row picked per grid size.
function textLines(cols, rows) {
  const mid = Math.floor(rows / 2);
  return [
    { text: 'otykh', row: mid - 1, shift: -3, color: '--secondary' },
    { text: 'portfolio', row: mid, shift: 3, color: '--secondary' },
    { text: '---- scroll down ----', row: rows - 3, shift: 0, color: '--secondary' },
  ].map(l => ({ ...l, col: Math.floor((cols - l.text.length) / 2) + l.shift }));
}

function resize() {
  const css = getComputedStyle(document.documentElement);
  const dpr = window.devicePixelRatio || 1;
  const w = hero.clientWidth;
  const h = hero.clientHeight;
  const font = css.getPropertyValue('--font');
  ctx.font = `${FONT_SIZE}px ${font}`;

  // The text is placed on the screen's rows; the scene runs FADE_ROWS further down, below the hero.
  const cellW = ctx.measureText('M').width;
  const cellH = FONT_SIZE * LINE_HEIGHT;
  const cols = Math.ceil(w / cellW);
  const screenRows = Math.ceil(h / cellH);
  const rows = screenRows + FADE_ROWS;
  const lines = textLines(cols, screenRows);
  const oy = (h - screenRows * cellH) / 2;
  const fadeH = rows * cellH + oy - h;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round((h + fadeH) * dpr);
  canvas.style.height = `${h + fadeH}px`;
  hero.style.marginBottom = `${fadeH}px`;

  const holes = lines.map(l => ({
    c0: l.col - TEXT_GAP,
    c1: l.col + l.text.length + TEXT_GAP,
    r0: l.row - TEXT_GAP,
    r1: l.row + TEXT_GAP,
  }));
  // Dots allowed in a cell: all outside holes, none inside, and on a hole's edge
  // only the half facing away from the text (corners combine both halves).
  const dotMask = (c, r) => {
    let mask = 0xff;
    for (const o of holes) {
      if (c < o.c0 || c >= o.c1 || r < o.r0 || r > o.r1) continue;
      let edge = 0xff;
      if (r === o.r0) edge &= TOP;
      if (r === o.r1) edge &= BOTTOM;
      if (c === o.c0) edge &= LEFT;
      if (c === o.c1 - 1) edge &= RIGHT;
      mask &= edge === 0xff ? 0 : edge;
    }
    return mask;
  };
  const mask = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) mask[r * cols + c] = dotMask(c, r);
  // Below the lowest text line the scene fades out: each dot row keeps fewer dots (picked once),
  // and paint() fades the colors into the background over the same rows.
  const fadeFrom = (Math.max(...lines.map(l => l.row)) + 1) * 4;
  for (let y = fadeFrom; y < rows * 4; y++) {
    const keep = 1 - (y - fadeFrom + 1) / (rows * 4 - fadeFrom + 1);
    for (let x = 0; x < cols * 2; x++) if (Math.random() >= keep) mask[(y >> 2) * cols + (x >> 1)] &= ~DOT_BIT[y & 3][x & 1];
  }

  grid = {
    dpr, font, cellW, cellH, lines, mask, oy,
    ox: (w - cols * cellW) / 2,
    gw: Math.ceil(cellW * dpr),
    gh: Math.ceil(cellH * dpr),
    bg: css.getPropertyValue('--bg').trim(),
  };
  const fadeTop = (oy + fadeFrom / 4 * cellH) * dpr;
  grid.fade = ctx.createLinearGradient(0, fadeTop, 0, canvas.height);
  grid.fade.addColorStop(0, grid.bg + '00');
  grid.fade.addColorStop(1, grid.bg);
  grid.fadeTop = fadeTop;
  atlases = new Map();

  frame.cols = cols;
  frame.rows = rows;
  frame.w = cols * 2;
  frame.h = rows * 4;
  frame.dots = new Uint8Array(frame.w * frame.h);
  frame.ink = new Uint8Array(cols * rows);
  frame.ripple = new Float32Array(frame.w * frame.h);
  frame.rippleCalm = true;
  frame.palette = [];
  frame.color('--main');
  for (const l of layers) l.resize(frame);
}

function atlasFor(color) {
  let a = atlases.get(color);
  if (a) return a;
  const { gw, gh, dpr, cellW, cellH, font } = grid;
  a = document.createElement('canvas');
  a.width = 256 * gw;
  a.height = gh;
  const g = a.getContext('2d');
  g.font = `${FONT_SIZE * dpr}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  for (let b = 1; b < 256; b++) g.fillText(String.fromCharCode(0x2800 + b), b * gw + cellW * dpr / 2, cellH * dpr / 2);
  atlases.set(color, a);
  return a;
}

function paint() {
  const { dpr, cellW, cellH, ox, oy, gw, gh, mask, lines } = grid;
  const { cols, rows, w, dots, ink, palette } = frame;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = grid.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Most cells are water and come from a prebuilt glyph image. The few other colored cells are
  // drawn as text, so any number of colors costs no extra memory.
  const water = atlasFor(palette[0]);
  ctx.font = `${FONT_SIZE * dpr}px ${grid.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let style = -1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      let bits = 0;
      for (let dy = 0; dy < 4; dy++) {
        const row = (r * 4 + dy) * w + c * 2;
        if (dots[row]) bits |= DOT_BIT[dy][0];
        if (dots[row + 1]) bits |= DOT_BIT[dy][1];
      }
      bits &= mask[i];
      if (!bits) continue;
      const x = Math.round((ox + c * cellW) * dpr);
      const y = Math.round((oy + r * cellH) * dpr);
      if (!ink[i]) { ctx.drawImage(water, bits * gw, 0, gw, gh, x, y, gw, gh); continue; }
      if (ink[i] !== style) ctx.fillStyle = palette[style = ink[i]];
      ctx.fillText(String.fromCharCode(0x2800 + bits), x + cellW * dpr / 2, y + cellH * dpr / 2);
    }
  }
  ctx.fillStyle = grid.fade;
  ctx.fillRect(0, grid.fadeTop, canvas.width, canvas.height - grid.fadeTop);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${FONT_SIZE}px ${grid.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const css = getComputedStyle(document.documentElement);
  for (const l of lines) {
    ctx.fillStyle = css.getPropertyValue(l.color);
    [...l.text].forEach((ch, i) => ctx.fillText(ch, ox + (l.col + i + 0.5) * cellW, oy + (l.row + 0.5) * cellH));
  }
}

let needsResize = true;
let heroVisible = true;      // the hero scene only runs while it is on screen
let last = 0;
function tick(now) {
  if (needsResize) { needsResize = false; resize(); }
  const t = now / 1000;
  const dt = Math.min(t - last, MAX_DT);
  last = t;

  if (heroVisible) {
    frame.dots.fill(0);
    frame.ink.fill(0);
    for (const l of layers) l.update(frame, dt, t);
    for (const l of layers) l.draw(frame);
    frame.pointer.moved = frame.pointer.tapped = false;
    paint();
  }
  Cards.tick(t);
  requestAnimationFrame(tick);
}

function pointerAt(e) {
  const rect = canvas.getBoundingClientRect();
  const p = frame.pointer;
  p.x = (e.clientX - rect.left - grid.ox) / grid.cellW * 2;
  p.y = (e.clientY - rect.top - grid.oy) / grid.cellH * 4;
  p.inside = p.x >= 0 && p.y >= 0 && p.x < frame.w && p.y < frame.h;
  return p;
}

// A mouse or pen makes ripples by moving; a finger by tapping (its moves are scrolling).
window.addEventListener('pointermove', e => {
  if (grid && e.pointerType !== 'touch') pointerAt(e).moved = true;
});
window.addEventListener('pointerdown', e => {
  if (grid && e.pointerType === 'touch') pointerAt(e).tapped = true;
});

document.fonts.load(`${FONT_SIZE}px "JetBrains Mono"`).finally(() => {
  new ResizeObserver(() => { needsResize = true; }).observe(hero);
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(canvas);
  Cards.init();
  requestAnimationFrame(t => { last = t / 1000; tick(t); });
});
