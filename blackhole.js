// Black Hole Incident card (personal project, half width, on the left): a glass jar in braille dots,
// lying on its side with its bottom on the left (standing up on narrow screens, its bottom at the
// bottom): a body with round corners at both ends, rounding in at the far end to a neck, a lip
// round the mouth, and a cork just showing past it, wider outside. A pale highlight runs along the
// glass. A paper label is stuck in the middle of the body: the card's text (the title with a link
// icon after it, the kind and year, and the description). Round the label, the jar is full of
// something purple that swirls, drifting along it and thickening and thinning: not a simulated
// liquid, a moving noise pattern setting how densely each part is dotted, in two shades. The label
// is old paper: a sparse grain and a dotted rule just inside its edge. Clicking the jar shakes it,
// and while it shakes the purple churns faster.
const BHI_COLS = 55;           // most columns wide: half the ESO card
const BHI_NECK = 7;            // columns of neck, lip and cork past the body (rows, standing up)
const BHI_LABEL = 2;           // columns of glass beside the label, each side, past what it needs to clear the corners
const BHI_PAD = [3, 1];        // cells between the label's edge and its text: columns, rows
const BHI_GLASS = 2;           // rows of glass above and below the label (lying down; standing, at each end)
const BHI_ROUND = 10;          // dots the body's corners are rounded by: the neck is this much narrower
const BHI_PARTS = [5, 2, 3];   // dots long: the neck, the lip, the cork past the lip
const BHI_SWIRL = {             // the purple haze:
  fps: 15,                     // times a second it is redrawn
  scale: [0.11, 0.13],         // how fine its pattern is, along and across the jar
  speed: [1.3, 1.1],           // how fast it drifts, along and across
  warp: 2,                     // how much each direction bends the other, so it curls
  breathe: [0.3, 0.9],         // how much and how fast it all thickens and thins
  fill: [0.8, 0.2],            // share of dots lit where the pattern is middling, and how far it swings either way
  deep: [-0.3, 0.8],           // above what value of the pattern dots turn deep, and how fast they do
};
const BHI_GRAIN = 0.07;        // share of the label's dots that are grain
const BHI_SHAKE = [700, 5, 6]; // the shake: how long (ms), how far it tips (degrees), how much faster the purple churns
const BHI_LINK = '↪︎'; // hooked arrow after the title, linking to the game

CARD_DESIGNS.blackhole = {
  max: BHI_COLS,
  left: true,

  layout(c) {
    const field = name => c.fields.find(f => f[0] === name)?.[1] ?? '';
    const [px, py] = BHI_PAD, up = c.up = !c.wide;
    // The label's columns [l0, l1), centered: standing, across the jar; lying, on the body, which
    // runs from dot 2 to the neck.
    let l0, l1;
    if (up) {
      const lw = c.cols - 4 - 2 * BHI_LABEL;
      l0 = Math.round((c.cols - lw) / 2);
      l1 = l0 + lw;
    } else {
      const body = c.cols - BHI_NECK, lw = body - 5 - 2 * BHI_LABEL;
      c.length = 2 * body - 2;
      l0 = Math.round((body + 1.5 - lw) / 2);
      l1 = l0 + lw;
    }
    // Standing, a row more of glass over and under the label, so it clears the shoulder.
    const tw = l1 - l0 - 2 * px, col = l0 + px, top = (up ? BHI_NECK + 1 : 0) + BHI_GLASS, row = top + py;
    // Every line wrapped to the label, the title leaving room for the link after its last line.
    const wrap = (text, w, color) => Cards.wrap(text, w).map(t => [t, color]);
    const title = wrap(field('Title'), tw - 2, '--main');
    const lines = [...title, ...wrap(field('Kind'), tw, '--secondary'), [field('Year'), '--secondary'], ['', ''],
      ...wrap(field('Description'), tw, '--main')];
    c.lines = lines.map(([text, color], i) => ({ text, color, col, row: row + i })).filter(l => l.text);
    const last = title.length - 1;
    c.lines.splice(title.length, 0, { text: BHI_LINK, color: '--link', col: col + title[last][0].length + 1, row: row + last });
    c.label = [l0, top, l1, row + lines.length + py];
    return c.label[3] + BHI_GLASS + (up ? 1 : 0);
  },

  draw(c) {
    const { cols, rows, up } = c, W = cols * 2, H = rows * 4;
    // Each dot one ink: the glass's outline, its tint inside, its highlight, the label's edge, the cork.
    const inks = ['--jar-glass', '--jar-tint', '--jar-shine', '--jar-label', '--cork', '--jar-paper'];
    const paint = new Uint8Array(W * H);
    const dither = (x, y, share) => BELL_BAYER[(y & 3) * 4 + (x & 3)] < share;

    // The jar in its own terms: u along it from the bottom, v across it from its middle. Lying, u runs
    // right from the card's left; standing, up from the card's bottom.
    const R = BHI_ROUND, [nl, ll, kl] = BHI_PARTS;
    const half = (up ? W : H) / 2 - 2, L = up ? H - 4 * BHI_NECK - 3 : c.length;
    const toJar = up ? (x, y) => [H - 3 - y, x - (W - 1) / 2] : (x, y) => [x - 2, y - (H - 1) / 2];
    const neck = half - R, mouth = L + nl, lip = mouth + ll;
    // The body: a box with round corners; the neck from its far corners' middle to the mouth; the
    // lip a little wider; the cork past it, widening outward, square.
    const inBody = (u, v) => {
      if (u < 0 || u > L || Math.abs(v) > half) return false;
      const cu = Math.min(Math.max(u, R), L - R), cv = Math.min(Math.abs(v), half - R);
      return Math.hypot(u - cu, Math.abs(v) - cv) <= R + 0.35;
    };
    const inJar = (u, v) => inBody(u, v) || (u >= L - R && u <= mouth && Math.abs(v) <= neck) || (u > mouth && u <= lip && Math.abs(v) <= neck + 1.5);
    const inCork = (u, v) => u > lip && u <= lip + kl && Math.abs(v) <= neck - 1 + (u - lip);
    const at = (x, y, f) => x >= 0 && y >= 0 && x < W && y < H && f(...toJar(x, y));
    // The dots the haze may fill (inside the glass, not its outline, highlight or label), and each
    // one's place along and across the jar.
    const room = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (at(x, y, inCork)) { paint[i] = 5; continue; }
        if (!at(x, y, inJar)) continue;
        const edge = !at(x - 1, y, inJar) || !at(x + 1, y, inJar) || !at(x, y - 1, inJar) || !at(x, y + 1, inJar);
        const [u, v] = toJar(x, y);
        // The highlight: a pale streak along one side, with a short second line beside it.
        const shine = (Math.round(v) === -(half - 2) && u > R && u < L - R - 4) || (Math.round(v) === -(half - 3) && u > R + 4 && u < R + 14);
        paint[i] = edge ? 1 : shine ? 3 : dither(x, y, 0.12) ? 2 : 0;
        if (!edge && !shine) room.push(i);
      }
    }
    // The lip's step down to the neck.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const [u, v] = toJar(x, y);
      if (Math.round(u) === mouth && Math.abs(v) <= neck + 1.5 && paint[y * W + x] !== 5) paint[y * W + x] = 1;
    }

    // The label: its edge, a dotted rule two dots inside it, and paper grain: a few lone dots and
    // short fibers, fixed per position. Nothing of the glass shows inside it.
    const [l0, t0, l1, t1] = c.label, lx0 = 2 * l0, lx1 = 2 * l1 - 1, ly0 = 4 * t0 - 1, ly1 = 4 * t1;
    for (let y = ly0; y <= ly1; y++) {
      for (let x = lx0; x <= lx1; x++) {
        const edge = x === lx0 || x === lx1 || y === ly0 || y === ly1;
        const rule = (x === lx0 + 2 || x === lx1 - 2) && y >= ly0 + 2 && y <= ly1 - 2 && y % 2 === 0
          || (y === ly0 + 2 || y === ly1 - 2) && x >= lx0 + 2 && x <= lx1 - 2 && x % 2 === 0;
        const grain = this.hash(x + 41, y + 13) < BHI_GRAIN || this.hash(x + 40, y + 13) < BHI_GRAIN * 0.4;
        paint[y * W + x] = edge ? 4 : rule ? 6 : grain ? 6 : 0;
      }
    }

    const layers = inks.map((color, k) => {
      const b = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (paint[i] === k + 1) b[i] = 1;
      return [b, color];
    });
    // The haze's room: not in the label or the dot round it.
    const free = room.filter(i => { const x = i % W, y = Math.floor(i / W); return x < lx0 - 1 || x > lx1 + 1 || y < ly0 - 1 || y > ly1 + 1; });
    const uv = new Float32Array(2 * free.length);
    free.forEach((i, k) => { const [u, v] = toJar(i % W, Math.floor(i / W)); uv[2 * k] = u; uv[2 * k + 1] = v; });
    const light = new Uint8Array(W * H), deep = new Uint8Array(W * H), any = new Uint8Array(W * H);
    c.text = new Set();
    for (const l of c.lines) for (let i = 0; i < l.text.length; i++) c.text.add(l.row * cols + l.col + i);
    Object.assign(c, { W, layers, haze: { free, uv, light, deep, any, last: -1, extra: 0 } });
    // Where the jar is, by cell: any of its dots, or the label. Clicking there shakes it.
    c.jar = new Set();
    for (let i = 0; i < W * H; i++) if (paint[i]) c.jar.add((Math.floor(i / W) >> 2) * cols + ((i % W) >> 1));
    for (let r = t0; r < t1; r++) for (let col = l0; col < l1; col++) c.jar.add(r * cols + col);
    this.shakeable(c);
    this.haze(c, 0);
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) this.cell(c, col, r);
    for (const l of c.lines) Cards.text(c, l.text, l.col, l.row, l.color);
    const link = c.lines.find(l => l.text === BHI_LINK);
    c.cellLinks.push([link.col, link.row, 1, `${c.fields.find(f => f[0] === 'Title')[1]} on itch.io`]);
  },

  // Draws one cell: the glass (its tint left out under the haze), the haze over it, the label, the
  // cork. Text cells show only their letters.
  cell(c, col, r) {
    if (c.text.has(r * c.cols + col)) return;
    Cards.clear(c, col, r, 1, 1);
    const { layers, haze, W } = c;
    const draw = (b, color, except) => { const ch = Cards.cell(b, W, col, r, except); if (ch !== '\u2800') Cards.text(c, ch, col, r, color); };
    draw(layers[0][0], layers[0][1]);
    draw(layers[1][0], layers[1][1], haze.any);
    draw(haze.light, '--jar-swirl');
    draw(haze.deep, '--jar-swirl-deep');
    for (const [b, color] of layers.slice(2)) draw(b, color);
  },

  // The haze at time t: a pattern of two sine waves, one along the jar and one across it, each bent
  // by the other so it curls, drifting with time, the whole of it slowly thickening and thinning.
  // It fills the jar: everywhere some of its dots are lit (evenly, by ordered dithering), more
  // where the pattern is high, and the higher, the more of them in the deeper shade. Returns the
  // cells that changed.
  haze(c, t) {
    const { free, uv, light, deep, any } = c.haze, S = BHI_SWIRL, W = c.W, dirty = new Set();
    const [su, sv] = S.scale, [pu, pv] = S.speed, [b0, b1] = S.breathe, [f0, f1] = S.fill, [d0, d1] = S.deep;
    const swell = b0 * Math.sin(t * b1);
    for (let k = 0; k < free.length; k++) {
      const i = free[k], u = uv[2 * k], v = uv[2 * k + 1], x = i % W, y = (i - x) / W;
      const a = Math.sin(u * su + t * pu + S.warp * Math.sin(v * sv - t * pv * 0.7));
      const b = Math.sin(v * sv - t * pv + S.warp * Math.sin(u * su * 0.6 + t * pu * 0.5));
      const n = (a + b) / 2 + swell, bayer = BELL_BAYER[(y & 3) * 4 + (x & 3)];
      const lit = bayer < Math.min(1, Math.max(0.5, f0 + f1 * n));
      const isDeep = lit && this.hash(x, y) < Math.max(0, n - d0) * d1;
      const isLight = lit && !isDeep;
      if (isDeep !== !!deep[i] || isLight !== !!light[i]) dirty.add((y >> 2) * c.cols + (x >> 1));
      deep[i] = isDeep ? 1 : 0;
      light[i] = isLight ? 1 : 0;
      any[i] = isDeep || isLight ? 1 : 0;
    }
    return dirty;
  },

  // A fixed pseudo-random value 0..1 for a dot position.
  hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },

  // The click that shakes the jar, and a pointer cursor over it (set up once per card).
  shakeable(c) {
    if (c.shakeReady) return;
    c.shakeReady = true;
    const over = e => {
      const r = c.canvas.getBoundingClientRect(), col = Math.floor((e.clientX - r.left) / c.cellW), row = Math.floor((e.clientY - r.top) / c.cellH);
      return c.jar.has(row * c.cols + col);
    };
    c.canvas.addEventListener('pointermove', e => { c.canvas.style.cursor = over(e) ? 'pointer' : ''; });
    c.canvas.addEventListener('pointerdown', e => { if (over(e)) this.shake(c); });
  },

  // Rocks the jar (with its label and text) side to side, dying down, round its middle; the purple
  // churns faster until it stops.
  shake(c) {
    const [ms, deg] = BHI_SHAKE, sheet = c.canvas.parentElement;
    sheet.animate([0, -1, 0.9, -0.7, 0.5, -0.3, 0.15, 0].map(k => ({ transform: `rotate(${k * deg}deg)` })),
      { duration: ms, easing: 'ease-out' });
    c.shakeUntil = performance.now() / 1000 + ms / 1000;
  },

  tick(c, t) {
    if (t - c.haze.last < 1 / BHI_SWIRL.fps) return;
    // While the jar shakes, the purple's clock runs faster.
    if (c.haze.last >= 0 && t < (c.shakeUntil ?? 0)) c.haze.extra += (t - c.haze.last) * BHI_SHAKE[2];
    c.haze.last = t;
    for (const k of this.haze(c, t + c.haze.extra)) this.cell(c, k % c.cols, Math.floor(k / c.cols));
  },
};
