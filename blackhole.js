// Black Hole Incident card (personal project, half width, on the left): a glass jar in braille dots,
// lying on its side with its bottom on the left (standing up on narrow screens, its bottom at the
// bottom): a body with round corners at both ends, rounding in at the far end to a neck, a lip
// round the mouth, and a cork just showing past it, wider outside. A pale highlight runs along the
// glass. A paper label is stuck in the middle of the body: the card's text (the title with a link
// icon after it, the kind and year, and the description). Round the label, the jar is full of
// something purple that swirls, drifting along it and thickening and thinning: not a simulated
// liquid, a moving noise pattern setting how densely each part is dotted, in two shades. The label
// is old paper: a sparse grain and a dotted rule just inside its edge. Clicking the jar shakes it:
// it rocks side to side on the character grid itself, its dots turned dot by dot and each letter of
// the label stepping up or down a row to follow; the purple swirls much faster, then slowly calms.
// Each click shakes it harder than the last; its glass cracks, and on the fifth click it
// implodes into a single dot that swallows the page, character by character. The dot explodes, and
// what it ate settles round it into a black hole with a disk of light. Clicked, the hole shakes
// harder and harder, shrinks, and collapses to a dot; after a pause, the dot bursts into a cloud of
// cyan and yellow crystals. Only reloading the page brings it back (see incident()).
const BHI_COLS = 55;           // most columns wide: half the ESO card
const BHI_NECK = [7, 3];       // columns of neck, lip and cork past the body lying down; rows of them standing up
const BHI_LABEL = 2;           // columns of glass beside the label, each side, past what it needs to clear the corners
const BHI_PAD = [3, 1];        // cells between the label's edge and its text: columns, rows
const BHI_GLASS = 2;           // rows of glass above and below the label (lying down; standing, at each end)
const BHI_ROUND = 10;          // dots the body's corners are rounded by: the neck is this much narrower
const BHI_PARTS = [5, 2, 3];   // dots long: the neck, the lip, the cork past the lip
const BHI_SWIRL = {             // the purple haze:
  fps: 15,                     // times a second it is redrawn
  scale: [0.11, 0.13],         // how fine its pattern is, along and across the jar
  warp: [7, 0.09, 0.05],       // its eddies: how far they carry it (dots), how fine they are, and the finer second set's
  speed: [1.1, 1.7],           // how fast the eddies turn: the first set, the second (the other way round)
  breathe: [0.3, 0.9],         // how much and how fast it all thickens and thins
  fill: [0.8, 0.2],            // share of dots lit where the pattern is middling, and how far it swings either way
  deep: [-0.3, 0.8],           // above what value of the pattern dots turn deep, and how fast they do
};
const BHI_GRAIN = 0.07;        // share of the label's dots that are grain
const BHI_SHAKE = [800, 5, 6, 30]; // the shake: how long (ms), how far it tips (degrees), how much faster the purple
                               // swirls right after, frames a second
const BHI_FURY = [5, 4, 0.35]; // the click that bursts the jar (however slow they come); from which click the
                               // glass cracks; how much harder each click shakes it than the one before
const BHI_SUCK = [1.8, 0.55, 3]; // the page falling in: seconds over which its characters start (nearest first),
                               // seconds each takes, how sharply each speeds up
const BHI_DUSK = [1.5, 0.5, 1.4]; // the page fading to night, on black: seconds after the jar bursts that it starts, seconds
                               // it takes; then seconds of stillness once the page is in, just the dot, before it explodes
const BHI_IMPLODE = 1.7;       // seconds from the jar blowing apart until its pieces have all spiralled into the dot
const BHI_HOLE = {             // the black hole, once the dot has exploded:
  radius: 0.13,                // its shadow's radius, × the view's shorter side (kept within 55 to 170 px)
  open: 0.8,                   // seconds it takes to open out to that
  disk: [1.5, 4],              // its disk's inner and outer edge, × the radius
  flat: 0.13,                  // how flat the disk looks (seen nearly edge on)
  tilt: -0.14,                 // its tilt (radians)
  spin: 1.6,                   // how fast the disk turns at its inner edge (radians a second; slower further out)
  count: 1900,                 // bits the dot throws out that settle into the disk
  escape: 0.08,                // share of them that fly off instead
  speed: [350, 1500],          // least and most speed (px a second) they are thrown out at
  settle: [0.9, 2.6],          // least and most seconds they take to settle into their orbit
};
const BHI_FALL = [2.8, [1, 10], 0.88, 0.6, 1.3]; // a click on it: seconds it shakes, least and most px it shakes by, how
                               // much smaller it gets meanwhile, seconds it collapses in, seconds the lone dot waits
const BHI_RIPPLE = [1700, 1, 140, 9]; // the jar's burst sends a ripple across the page: its speed (px a second), how many
                               // (one), how far apart they would be and how wide it is (px), how far it pushes the characters (px)
const BHI_HEAT = ['#2a0a5e', '#4b1a9e', '#7a3fd6', '#a97bf0', '#d6c2ff', '#ffffff']; // the disk's light, from its
                               // cool outer edge to white hot near the hole: purple where a real one is red
const BHI_CRYSTALS = {         // what the dot bursts into:
  count: 1100,                 // crystals (cyan and yellow dots, now and then a + of them, glinting), thrown out to
                               // all over the view, where they slow and drift
  dust: 1500,                  // fine dust thrown out with them, fading
  streaks: 450,                // and the most violent: small bits streaking straight across the view and out of it
  streak: [1.6, 3.5],          // their least and most speed, × the distance to the view's farthest corner a second
  drift: [2, 8],               // least and most px a second the crystals drift at, at first
  settle: 12,                  // seconds after the burst by which they have come to rest, as plain white dots
  whiten: 4,                   // seconds before that over which they turn white, their glints and +s going
};
const BHI_BACK = ['back to the beginning', 5]; // what shows in the middle once the crystals have settled, and how
                               // many seconds after: clicking it reloads the page
const BHI_CALM = 3;            // seconds for the purple's extra speed to fall to about a third, after a shake
const BHI_LINK = '↪︎'; // hooked arrow after the title, linking to the game
const BHI_HINT = "don't break the bottle"; // in gray at the bottom right of the signs beside the card (under the jar
                               // on narrow screens)
// Right of the card, on wide screens only: the FRAGILE sign (a goblet, cracked) stamped over and
// over, scattered, and strips of packing tape across it printed with the word. Muted colours.
const BHI_PROPS = {
  tries: 300,                  // spots tried for signs (each kept if clear of the others by `gap` dots)
  gap: 3,
  tapes: [[3, 3, 1, 6], [8, 11, -1, 6]], // tape strips, crossing (the later on top): the column and row they start at,
                               // which way they step (a row down, or up), and how many times the word is printed
  print: 'FRAGILE',            // the word printed along the tape, once a step
};

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
      const body = c.cols - BHI_NECK[0], lw = body - 5 - 2 * BHI_LABEL;
      c.length = 2 * body - 2;
      l0 = Math.round((body + 1.5 - lw) / 2);
      l1 = l0 + lw;
    }
    // Standing, a row more of glass over and under the label, so it clears the shoulder.
    const tw = l1 - l0 - 2 * px, col = l0 + px, top = (up ? BHI_NECK[1] + 1 : 0) + BHI_GLASS, row = top + py;
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
    const half = (up ? W : H) / 2 - 2, L = up ? H - 4 * BHI_NECK[1] - 3 : c.length;
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
    this.props(c);
  },

  // The FRAGILE signs and tape right of the card (wide screens only, see BHI_PROPS), on a canvas
  // of its own beside it, on the same grid: the signs in dots, the tape's print in letters; and the
  // hint (BHI_HINT) in its bottom right corner. On narrow screens the canvas is just a row under the
  // jar, the hint in its middle.
  props(c) {
    if (!c.side) {
      c.side = document.createElement('canvas');
      c.side.className = 'bhi-side';
      c.side.setAttribute('aria-hidden', 'true');
      c.canvas.parentElement.append(c.side);
    }
    const room = Math.min(CARD_MAX, Math.floor(document.documentElement.clientWidth / c.cellW) - 2 * CARD_GAP);
    const beside = c.wide && room - c.cols >= 20, cols = beside ? room - c.cols : c.cols, rows = beside ? c.rows : 1, cv = c.side;
    Object.assign(cv.style, { left: `${beside ? c.cols * c.cellW : 0}px`, top: `${beside ? 0 : c.rows * c.cellH}px`,
      width: `${cols * c.cellW}px`, height: `${rows * c.cellH}px` });
    cv.width = Math.round(cols * c.cellW * c.dpr);
    cv.height = Math.round(rows * c.cellH * c.dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    ctx.font = `${FONT_SIZE}px ${c.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hint = [...BHI_HINT], hc = beside ? cols - hint.length - 1 : Math.floor((cols - hint.length) / 2), hr = rows - 1;
    ctx.fillStyle = c.color('--secondary');
    hint.forEach((ch, i) => ctx.fillText(ch, (hc + i + 0.5) * c.cellW, (hr + 0.5) * c.cellH));
    if (!beside) return;
    const hinted = new Set(hint.map((_, i) => hr * cols + hc + i));

    const P = BHI_PROPS, W = cols * 2, H = rows * 4, signs = new Uint8Array(W * H), tape = new Uint8Array(W * H);
    // The sign, 7 × 12 dots: a goblet filled in, a crack zigzagging down its bowl, a thin stem and
    // its foot.
    const SIGN = ['#######', '###.###', '.#.###.', '.##.##.', '..#.#..', '...#...', '...#...',
      '...#...', '...#...', '...#...', '..###..', '.#####.'];
    // Scattered: random spots (the same each time), each kept if clear of those kept before. The
    // tape goes over them.
    const kept = [];
    for (let k = 0; k < P.tries; k++) {
      const x = Math.floor(this.hash(k, 31) * (W - 6)), y = Math.floor(this.hash(k + 13, 5) * (H - 11));
      if (kept.some(([a, b]) => Math.abs(a - x) < 7 + P.gap && Math.abs(b - y) < 12 + P.gap)) continue;
      kept.push([x, y]);
      SIGN.forEach((line, j) => [...line].forEach((ch, i) => { if (ch === '#') signs[(y + j) * W + x + i] = 1; }));
    }
    // The tape, a row of print between two edges, slanting by steps: the word along a row, then a
    // step a row down (or up) through a column of its own, both edges turning there, the word
    // again, and on. Each strip hides what's under it: the signs, and the strips before it.
    const print = new Map(), under = new Uint8Array(W * H);
    const hide = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) { under[y * W + x] = 1; tape[y * W + x] = 0; } };
    const edge = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) tape[y * W + x] = 1; };
    const n = P.print.length;
    for (const [c0, r0, dir, times] of P.tapes) {
      const marks = [];
      let row = r0;
      for (let col = c0; col < Math.min(c0 + (n + 1) * times - 1, cols); col++) {
        const at = (col - c0) % (n + 1), want = at === n ? row + dir : row;
        const x0 = 2 * col, top = 4 * row - 1, bottom = 4 * row + 4;
        if (want !== row) {
          // The step: both edges down (or up) a row, in this column.
          const d = Math.sign(want - row);
          for (let y = Math.min(top, top + 4 * d); y <= Math.max(top, top + 4 * d); y++) marks.push([x0, y]);
          for (let y = Math.min(bottom, bottom + 4 * d); y <= Math.max(bottom, bottom + 4 * d); y++) marks.push([x0, y]);
          marks.push([x0 + 1, top + 4 * d], [x0 + 1, bottom + 4 * d]);
          for (let y = Math.min(top, top + 4 * d) + 1; y < Math.max(bottom, bottom + 4 * d); y++) { hide(x0, y); hide(x0 + 1, y); }
          print.delete(Math.floor((top + 4 * d + 1) / 4) * cols + col);
          row = want;
          continue;
        }
        marks.push([x0, top], [x0 + 1, top], [x0, bottom], [x0 + 1, bottom]);
        for (let y = top; y <= bottom; y++) { hide(x0, y); hide(x0 + 1, y); }
        // A cell its edges pass through can't show the print of a strip under it.
        print.delete((row - 1) * cols + col); print.delete((row + 1) * cols + col);
        if (row >= 0 && row < rows) print.set(row * cols + col, P.print[at]);
      }
      for (const [x, y] of marks) edge(x, y);
    }
    const sign = c.color('--prop-red'), rim = c.color('--prop-tape'), ink = c.color('--prop-print');
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = (col + 0.5) * c.cellW, y = (row + 0.5) * c.cellH, ch = print.get(row * cols + col);
      if (hinted.has(row * cols + col)) continue;
      if (ch != null) {
        if (ch !== ' ') { ctx.fillStyle = ink; ctx.fillText(ch, x, y); }
        continue;
      }
      for (const [b, color, except] of [[signs, sign, under], [tape, rim]]) {
        const ch = Cards.cell(b, W, col, row, except);
        if (ch !== '⠀') { ctx.fillStyle = color; ctx.fillText(ch, x, y); }
      }
    }
  },

  // Draws one cell: the glass (its tint left out under the haze), the haze over it, the label, the
  // cork. Text cells show only their letters. `b` is the dots to draw: the jar's own, or (while it
  // shakes) turned copies of them.
  cell(c, col, r, b = { layers: c.layers, light: c.haze.light, deep: c.haze.deep, any: c.haze.any }, text = c.text) {
    if (text.has(r * c.cols + col)) return;
    Cards.clear(c, col, r, 1, 1);
    const draw = (buf, color, except) => { const ch = Cards.cell(buf, c.W, col, r, except); if (ch !== '\u2800') Cards.text(c, ch, col, r, color); };
    draw(b.layers[0][0], b.layers[0][1]);
    draw(b.layers[1][0], b.layers[1][1], b.any);
    draw(b.light, '--jar-swirl');
    draw(b.deep, '--jar-swirl-deep');
    for (const [buf, color] of b.layers.slice(2)) draw(buf, color);
  },

  // The whole card with the jar turned by angle a (radians) round the card's middle, on the grid:
  // each dot takes the dot that turns onto it, and each cell the letter whose cell's middle turns
  // onto its own (so letters step up and down rows, and none are lost).
  turned(c, a) {
    const { W, cols, rows } = c, H = rows * 4, cx = W / 2, cy = H / 2, cos = Math.cos(a), sin = Math.sin(a);
    const from = new Int32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cy, sx = Math.round(cx + dx * cos + dy * sin), sy = Math.round(cy - dx * sin + dy * cos);
        from[y * W + x] = sx >= 0 && sy >= 0 && sx < W && sy < H ? sy * W + sx : -1;
      }
    }
    const turn = buf => { const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (from[i] >= 0) out[i] = buf[from[i]]; return out; };
    const b = { layers: c.layers.map(([buf, color]) => [turn(buf), color]), light: turn(c.haze.light), deep: turn(c.haze.deep), any: turn(c.haze.any) };
    const at = new Map(), letters = new Map();
    for (const l of c.lines) [...l.text].forEach((ch, i) => at.set(l.row * cols + l.col + i, [ch, l.color]));
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const dx = 2 * col + 1 - cx, dy = 4 * r + 2 - cy;
        const sc = Math.floor((cx + dx * cos + dy * sin) / 2), sr = Math.floor((cy - dx * sin + dy * cos) / 4);
        const letter = sc >= 0 && sr >= 0 && sc < cols && sr < rows && at.get(sr * cols + sc);
        if (letter) letters.set(r * cols + col, letter);
      }
    }
    const text = new Set(letters.keys());
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) this.cell(c, col, r, b, text);
    for (const [k, [ch, color]] of letters) { Cards.clear(c, k % cols, Math.floor(k / cols), 1, 1); Cards.text(c, ch, k % cols, Math.floor(k / cols), color); }
  },

  // The haze at time t: a still pattern of sine waves (along the jar, across it, and slanting), seen
  // through eddies: each point is pushed by two sets of waves whose push turns round in circles
  // with time, one set one way and one the other. So the pattern churns round in place with no
  // drift in any direction; and the whole of it slowly thickens and thins.
  // It fills the jar: everywhere some of its dots are lit (evenly, by ordered dithering), more
  // where the pattern is high, and the higher, the more of them in the deeper shade. Returns the
  // cells that changed.
  haze(c, t) {
    const { free, uv, light, deep, any } = c.haze, S = BHI_SWIRL, W = c.W, dirty = new Set();
    const [su, sv] = S.scale, [wa, w1, w2] = S.warp, [p1, p2] = S.speed, [b0, b1] = S.breathe, [f0, f1] = S.fill, [d0, d1] = S.deep;
    const swell = b0 * Math.sin(t * b1);
    for (let k = 0; k < free.length; k++) {
      const i = free[k], u = uv[2 * k], v = uv[2 * k + 1], x = i % W, y = (i - x) / W;
      const pu = u + wa * (Math.sin(v * w1 + t * p1) + 0.5 * Math.cos(v * w2 * 2 + u * w2 - t * p2));
      const pv = v + wa * (Math.cos(u * w1 + t * p1) + 0.5 * Math.sin(u * w2 * 2 - v * w2 - t * p2));
      const n = (Math.sin(pu * su) + Math.sin(pv * sv) + Math.sin((pu + pv) * su * 0.7)) / 2.2 + swell;
      const bayer = BELL_BAYER[(y & 3) * 4 + (x & 3)];
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

  // Starts the jar rocking (see tick).
  shake(c) {
    if (c.burst) return;
    const now = performance.now(), [n, crack, more] = BHI_FURY, k = c.clicks = (c.clicks || 0) + 1;
    if (k >= n) { this.explode(c); return; }
    c.fury = 1 + more * (k - 1);
    if (k >= crack) this.crack(c);
    c.shakeFrom = now / 1000;
    c.shakeUntil = c.shakeFrom + BHI_SHAKE[0] / 1000;
  },

  // A crack in the glass: a jagged line of pale dots wandering out from a random spot in the purple.
  crack(c) {
    const { free } = c.haze, W = c.W, shine = c.layers[2][0], ok = new Set(free);
    let i = free[Math.floor(Math.random() * free.length)], dx = Math.random() < 0.5 ? -1 : 1, dy = Math.random() < 0.5 ? -1 : 1;
    for (let k = 0; k < 14; k++) {
      shine[i] = 1;
      if (Math.random() < 0.35) dx = -dx;
      if (Math.random() < 0.35) dy = -dy;
      const next = i + (Math.random() < 0.6 ? dx : 0) + (Math.random() < 0.6 ? dy * W : 0);
      if (!ok.has(next)) break;
      i = next;
    }
  },

  // The jar gives way: it is cleared from its card (with its text and links), and every dot of it
  // becomes a bit at its place on the screen, which the incident pulls into a single dot.
  explode(c) {
    const { W, rows } = c, H = rows * 4, box = c.canvas.getBoundingClientRect();
    const dw = c.cellW / 2, dh = c.cellH / 4, bits = [];
    const add = (buf, color) => {
      for (let i = 0; i < W * H; i++) {
        if (!buf[i]) continue;
        const x = i % W, y = (i - x) / W;
        bits.push({ x: box.left + (x + 0.5) * dw, y: box.top + (y + 0.5) * dh, color });
      }
    };
    for (const [buf, color] of c.layers) add(buf, c.color(color));
    add(c.haze.light, c.color('--jar-swirl'));
    add(c.haze.deep, c.color('--jar-swirl-deep'));
    c.ctx.clearRect(0, 0, c.cols * c.cellW, c.rows * c.cellH);
    c.copy.style.visibility = c.links.style.visibility = 'hidden';
    c.canvas.style.cursor = '';
    c.burst = true;
    this.incident(c, box.left + box.width / 2, box.top + box.height / 2, bits);
  },

  // The page as tiles of characters: every canvas on it (the hero and the cards, not the blurred
  // glows) drawn into one picture of the view, cut along each canvas's own grid of cells, keeping
  // the tiles that have anything on them. Returns the picture and the tiles (just the picture
  // without `cut`).
  snapshot(dpr, cut = true) {
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    const pic = document.createElement('canvas');
    Object.assign(pic, { width: W, height: H });
    const g = pic.getContext('2d'), grids = [];
    for (const cv of document.body.querySelectorAll('canvas')) {
      const r = cv.getBoundingClientRect();
      if (cv.classList.contains('neon-glow') || !cv.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      g.drawImage(cv, r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr);
      // A card's own canvas, or one laid on its grid (the sun's heat waves).
      const card = Cards.cards.find(k => k.canvas === cv || k.rayCanvas === cv || k.side === cv);
      const cw = card ? card.cellW : cv === document.getElementById('grid') ? grid.cellW : 0, ch = card ? card.cellH : cv === document.getElementById('grid') ? grid.cellH : 0;
      if (cw) grids.push([r, cw, ch, cv === document.getElementById('grid') ? grid.ox : 0, cv === document.getElementById('grid') ? grid.oy : 0]);
    }
    if (!cut) return { pic };
    // Which tiles have ink, read off a copy a quarter the size (any ink leaves some there).
    const SW = Math.ceil(W / 4), SH = Math.ceil(H / 4), small = document.createElement('canvas');
    Object.assign(small, { width: SW, height: SH });
    const sg = small.getContext('2d', { willReadFrequently: true });
    sg.drawImage(pic, 0, 0, SW, SH);
    const data = sg.getImageData(0, 0, SW, SH).data, tiles = [];
    for (const [r, cw, ch, ox, oy] of grids) {
      for (let y = r.top + oy; y < Math.min(r.bottom, innerHeight); y += ch) {
        for (let x = r.left + ox; x < Math.min(r.right, innerWidth); x += cw) {
          if (y + ch < 0 || x + cw < 0) continue;
          const x0 = Math.max(0, Math.round(x * dpr)), y0 = Math.max(0, Math.round(y * dpr)), x1 = Math.min(W, Math.round((x + cw) * dpr)), y1 = Math.min(H, Math.round((y + ch) * dpr));
          let ink = false;
          for (let py = y0 >> 2; py <= Math.min(SH - 1, (y1 - 1) >> 2) && !ink; py++) for (let px = x0 >> 2; px <= Math.min(SW - 1, (x1 - 1) >> 2) && !ink; px++) ink = data[(py * SW + px) * 4 + 3] > 0;
          if (ink) tiles.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        }
      }
    }
    return { pic, tiles };
  },

  // The incident, on one canvas over the whole view, all of it in dots on the braille grid (squares
  // the size of a braille dot, a dot apart, laid on a grid through the hole's middle):
  //  - The jar's dots spiral into a single dark dot where it was, and everything else on the page
  //    stops; a picture of the page takes its place, and its characters fall straight into the dot,
  //    the nearest first, shrinking and speeding up. Partway through, the page quickly fades to
  //    night, onto pure black: space, its sun swallowed. The rest plays out at night.
  //  - Once the page is in and dark, the dot waits a moment, still, then explodes: it throws out bits of light, and opens into a black
  //    hole, a round shadow of dense dark dots with a thin bright ring round it. Most bits slow down
  //    and settle into orbits round it, making its disk: a flat ring seen nearly edge on, crossing
  //    in front of the shadow, brighter near the hole and on the side turning toward us, its far
  //    side bent up over the top of the shadow as an arc, and a fainter arc under it. The rest fly
  //    off. Then the hole waits, its disk turning.
  //  - Clicked, it shakes, gently and then more and more violently, shrinking, its disk turning
  //    faster; then it collapses into a single dot, which waits a moment and bursts: a shockwave, a
  //    cloud of cyan and yellow crystals glinting as they fly out and drift, and fine dust.
  // Only reloading the page brings it back.
  incident(c, hx, hy, bits) {
    const doc = document.documentElement, dpr = window.devicePixelRatio || 1;
    doc.style.overflow = 'hidden';
    const view = document.createElement('canvas');
    Object.assign(view.style, { position: 'fixed', left: '0', top: '0', width: `${innerWidth}px`, height: `${innerHeight}px`, zIndex: '9999', pointerEvents: 'none' });
    view.setAttribute('aria-hidden', 'true');
    doc.append(view);
    const W = view.width = Math.round(innerWidth * dpr), H = view.height = Math.round(innerHeight * dpr), g = view.getContext('2d');
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [spread, each, sharp] = BHI_SUCK, HO = BHI_HOLE, [inner, outer] = HO.disk, [shakeT, [amp0, amp1], shrink, fallT, pause] = BHI_FALL, CR = BHI_CRYSTALS;
    // The grid: a dot's step across and down, and how big a dot is drawn (bigger in the shadow).
    const X = hx * dpr, Y = hy * dpr, px = c.cellW / 2 * dpr, py = c.cellH / 4 * dpr;
    const dot = Math.max(1.15 * dpr, px * 0.25), fat = px * 0.32;
    const R = Math.min(170, Math.max(55, Math.min(innerWidth, innerHeight) * HO.radius)) * dpr;
    const far = Math.hypot(Math.max(X, W - X), Math.max(Y, H - Y)) + 4 * px;
    // Colours: the disk's heat, and the crystals'.
    const heat = BHI_HEAT;
    // (the crystals' are the night's: read once the page has turned to night, see frame).
    let cr = [], pale = [];
    // Dots to draw this frame, by colour: those behind the shadow, and those in front of it.
    const back = new Map(), front = new Map();
    const put = (b, color, x, y) => {
      const sx = X + Math.round((x - X) / px) * px, sy = Y + Math.round((y - Y) / py) * py;
      if (sx < -px || sy < -py || sx > W + px || sy > H + py) return;
      let a = b.get(color);
      if (!a) b.set(color, a = []);
      a.push(sx, sy);
    };
    // Round dots, like braille's, drawn once per colour into a little picture and then only
    // copied: much cheaper than drawing circles each frame.
    const sprites = new Map(), sz = 2 * Math.ceil(dot + 1) + 1; // odd: the dot centred on a pixel, so it comes out round, not a square
    const sprite = color => {
      let img = sprites.get(color);
      if (img) return img;
      img = document.createElement('canvas');
      img.width = img.height = sz;
      const sg = img.getContext('2d');
      sg.beginPath();
      sg.arc(sz / 2, sz / 2, dot, 0, 2 * Math.PI);
      sg.fillStyle = color;
      sg.fill();
      sprites.set(color, img);
      return img;
    };
    const flush = b => {
      for (const [color, a] of b) {
        const img = sprite(color), o = sz / 2;
        for (let i = 0; i < a.length; i += 2) g.drawImage(img, Math.round(a[i] - o), Math.round(a[i + 1] - o));
        a.length = 0;
      }
    };
    // A round patch of dark dots, radius r (a single dot when r is under a dot's step): each row of
    // it copied from a strip of such dots drawn once, so any radius costs a few dozen copies.
    const strips = new Map(), cols = 2 * Math.ceil(R / px) + 3, sh = Math.ceil(2 * fat + 4);
    const strip = color => {
      let img = strips.get(color);
      if (img) return img;
      img = document.createElement('canvas');
      img.width = Math.ceil(cols * px); img.height = sh;
      const sg = img.getContext('2d');
      sg.fillStyle = color;
      sg.beginPath();
      for (let i = 0; i < cols; i++) { sg.moveTo((i + 0.5) * px + fat, sh / 2); sg.arc((i + 0.5) * px, sh / 2, fat, 0, 2 * Math.PI); }
      sg.fill();
      strips.set(color, img);
      return img;
    };
    const shadow = (r, color = '#000') => {
      const img = strip(color);
      for (let j = -Math.floor(r / py); j <= r / py; j++) {
        const dy = j * py, n = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) / px + 1e-6), w = (2 * n + 1) * px;
        g.drawImage(img, 0, 0, w, sh, Math.round(X - n * px - px / 2), Math.round(Y + dy - sh / 2), w, sh);
      }
    };
    const smooth = u => (u = Math.min(1, Math.max(0, u))) * u * (3 - 2 * u);
    // One seeded run of random numbers for the whole incident: it plays out the same each time.
    let seed = 0x9e3779b9;
    const rnd = () => { seed = seed + 0x6d2b79f5 | 0; let z = Math.imul(seed ^ seed >>> 15, 1 | seed); z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z; return ((z ^ z >>> 14) >>> 0) / 4294967296; };
    const rand = ([a, b]) => a + rnd() * (b - a);

    let page = null, rest = null, restN = null, start = null, last = null;
    const bg0 = c.color('--bg'), dusk = [BHI_DUSK[0], BHI_DUSK[0] + BHI_DUSK[1]];
    let tE = null, tC = null, tX = null, disk = [], gems = [], dust = [], streaks = [];
    // Everything the hole and the burst throw out, worked out now, so nothing is made mid-way.
    for (let k = 0; k < HO.count; k++) {
      const ro = inner + (outer - inner) * rnd() ** 1.6;
      disk.push({
        ro, a: rnd() * 2 * Math.PI, w: HO.spin * (inner / ro) ** 1.5, th: rnd() * 2 * Math.PI,
        v: rand(HO.speed) * dpr, ts: rand(HO.settle), esc: rnd() < HO.escape, j: rnd(),
      });
    }
    // Each crystal is thrown to its own spot, so they end up spread over the whole view (evenly
    // over its area); the faster the farther.
    for (let k = 0; k < CR.count; k++) {
      const to = 6 * px + (far * 1.05 - 6 * px) * Math.sqrt(rnd());
      gems.push({ th: rnd() * 2 * Math.PI, v: to * 1.6, drift: rand(CR.drift) * dpr,
        size: rnd() < 0.88 ? 0 : 1, color: rnd() < 0.5 ? 0 : 1, ph: rnd() * 10 });
    }
    for (let k = 0; k < CR.streaks; k++) streaks.push({ th: rnd() * 2 * Math.PI, v: rand(CR.streak) * far, color: k % 3 ? k % 2 ? 0 : 1 : 2 });
    for (let k = 0; k < CR.dust; k++) dust.push({ th: rnd() * 2 * Math.PI, v: rand([400, 3200]) * dpr, life: rand([0.6, 2.2]), color: k % 2 });
    // The dots' pictures, drawn now too.
    for (const color of [...heat, ...new Set(bits.map(b => b.color))]) sprite(color);
    strip('#000'); strip('#ffffff');
    // Waiting, the hole can be clicked: over it the cursor is a pointer.
    const onHole = e => Math.hypot(e.clientX * dpr - X, e.clientY * dpr - Y) < R * 2;
    let idle = false;
    view.addEventListener('pointermove', e => { view.style.cursor = idle && tC == null && onHole(e) ? 'pointer' : ''; });
    view.addEventListener('click', e => { if (idle && tC == null && onHole(e)) { tC = last - start; view.style.cursor = ''; } });

    const frame = now => {
      const t = now / 1000 - start, dt = Math.min(0.05, now / 1000 - last);
      last = now / 1000;
      // The page swallowed: the picture and its tiles, each with when it starts falling.
      if (!page) {
        Cards.stopped = true;
        page = this.snapshot(dpr);
        // The same page at night, for it to fade into: everything redrawn in the dark theme (just
        // for now: reloading brings back the reader's own), and pictured again.
        doc.dataset.theme = 'dark';
        Cards.layoutAll();
        if (heroVisible) { needsResize = true; Cards.stopped = false; tick(performance.now()); Cards.stopped = true; }
        page.night = this.snapshot(dpr, false).pic;
        cr = ['--crystal-cyan', '--crystal-gold', '--crystal-core'].map(c.color);
        // Each crystal colour on its way to white, in steps (each its own dot picture, drawn now).
        pale = cr.map(color => Array.from({ length: 9 }, (_, i) => Cards.mix(color, '#ffffff', i / 8)));
        for (const color of pale.flat()) sprite(color);
        document.body.style.visibility = 'hidden';
        // What's left of the page as one picture, by day and at night: only its characters (redrawn,
        // the jar would be back at night).
        [rest, restN] = [page.pic, page.night].map(pic => {
          const cv = document.createElement('canvas');
          Object.assign(cv, { width: W, height: H });
          const cg = cv.getContext('2d');
          for (const tl of page.tiles) cg.drawImage(pic, tl.x, tl.y, tl.w, tl.h, tl.x, tl.y, tl.w, tl.h);
          return cv;
        });
        const ds = page.tiles.map(tl => Math.hypot(tl.x + tl.w / 2 - X, tl.y + tl.h / 2 - Y));
        let d0 = Infinity, d1 = -Infinity;
        for (const d of ds) { d0 = Math.min(d0, d); d1 = Math.max(d1, d); }
        d1 = Math.max(d1, d0 + 1);
        // The jar's pieces fly out every which way, evenly.
        for (const b of bits) {
          const a = rnd() * 2 * Math.PI, v = (250 + rnd() ** 2 * 900) * dpr;
          Object.assign(b, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, lag: rnd() * 0.3 });
        }
        page.tiles.forEach((tl, k) => {
          tl.at = 0.4 + spread * ((ds[k] - d0) / (d1 - d0)) ** 0.8 + rnd() * 0.15;
          tl.dx = tl.x + tl.w / 2 - X; tl.dy = tl.y + tl.h / 2 - Y; tl.d = Math.hypot(tl.dx, tl.dy) || 1;
        });
        page.left = page.tiles.length;
      }
      // The fade: the view's ground going from the page's to black, and each of the page's
      // characters drawn as by day, fading out, under itself at night, fading in.
      const f = smooth((t - dusk[0]) / (dusk[1] - dusk[0]));
      if (f !== frame.f) { frame.f = f; view.style.background = Cards.mix(bg0, '#000000', f); }
      const both = draw => {
        if (f < 1) { g.globalAlpha = 1 - f; draw(page.pic, rest); }
        if (f > 0) { g.globalAlpha = f; draw(page.night, restN); }
        g.globalAlpha = 1;
      };
      // Once the page is in and the dot has sat still a while, it explodes; once the collapsed dot has waited, it bursts.
      if (tE == null && page.left === 0 && t > BHI_IMPLODE) tE = Math.max(t, dusk[1]) + BHI_DUSK[2];
      if (tC != null && tX == null && t >= tC + shakeT + fallT + pause) tX = t;

      // Where things stand: the hole's radius now (0 before it opens, and as it collapses), the
      // shaking, how fast its disk turns.
      let r = 0, jolt = 0, boost = 1;
      const eaten = page.tiles.length ? 1 - page.left / page.tiles.length : 1;
      // A single dot while it eats; once the page is in, it opens out into the hole.
      if (tE != null && t >= tE) {
        const o = Math.min(1, (t - tE) / HO.open), back2 = 1 + 2.2 * (o - 1) ** 3 + 1.2 * (o - 1) ** 2;
        r = R * (o < 1 ? Math.max(0, back2) : 1);
        jolt = 14 * dpr * Math.max(0, 1 - (t - tE) / 0.9) ** 2;
      } else if (page.left) jolt = 2 * dpr * Math.min(1, t / 0.6) * eaten; // still once the page is in
      if (tC != null) {
        const u = Math.min(1, (t - tC) / shakeT), v = Math.min(1, Math.max(0, (t - tC - shakeT) / fallT));
        r = R * (1 - (1 - shrink) * u ** 2.5) * (1 - v ** 3);
        jolt = v < 1 ? (amp0 + (amp1 - amp0) * u * u) * dpr : 0;
        boost = 1 + 7 * u + 14 * v;
      }
      // The burst shakes the view too.
      if (tX != null) jolt = 18 * dpr * Math.max(0, 1 - (t - tX) / 0.7) ** 2;
      if (calm) jolt = 0;

      const out = (x, y) => x < -40 || y < -40 || x > W + 40 || y > H + 40;
      // Late on, with only the crystals drifting, a lower frame rate does.
      if (tX != null && t - tX > 5 && t - (frame.drawn ?? -1) < 1 / 30) { requestAnimationFrame(frame); return; }
      frame.drawn = t;

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.setTransform(1, 0, 0, 1, (rnd() * 2 - 1) * jolt, (rnd() * 2 - 1) * jolt);

      // The page falling in.
      if (page.left) {
        const rg = rest.getContext('2d'), rgN = restN.getContext('2d');
        if (!page.emptied && t > 0.4 + spread + 0.2) { rg.clearRect(0, 0, W, H); rgN.clearRect(0, 0, W, H); page.emptied = true; }
        // While the ripple crosses it, the characters it is passing are pushed out and back: the
        // page drawn as one picture, those cut out of it and drawn again, shifted.
        const [rs, rn, rgap, ramp] = BHI_RIPPLE, front0 = rs * dpr * t;
        if (!page.emptied && front0 - rn * rgap * dpr < far) {
          both((pic, rst) => g.drawImage(rst, 0, 0));
          const moved = [];
          for (const tl of page.tiles) {
            if (tl.lifted) continue;
            const d = tl.d;
            let push = 0;
            for (let k = 0; k < rn; k++) {
              const q = (front0 - k * rgap * dpr - d) / (rgap * dpr * 0.5);
              if (q > -1 && q < 1) push += Math.sin(q * Math.PI) * (1 - Math.abs(q)) * (1 - k / rn);
            }
            if (!push) continue;
            push *= ramp * dpr * Math.max(0.25, 1 - d / far);
            g.clearRect(tl.x, tl.y, tl.w, tl.h);
            moved.push(tl, push);
          }
          both(pic => {
            for (let i = 0; i < moved.length; i += 2) {
              const tl = moved[i], push = moved[i + 1];
              g.drawImage(pic, tl.x, tl.y, tl.w, tl.h, Math.round(tl.x + tl.dx / tl.d * push), Math.round(tl.y + tl.dy / tl.d * push), tl.w, tl.h);
            }
          });
        } else if (!page.emptied) both((pic, rst) => g.drawImage(rst, 0, 0));
        const falling = [];
        for (const tl of page.tiles) {
          if (t < tl.at || tl.gone) continue;
          if (!tl.lifted) { rg.clearRect(tl.x, tl.y, tl.w, tl.h); rgN.clearRect(tl.x, tl.y, tl.w, tl.h); tl.lifted = true; }
          const p = Math.min(1, (t - tl.at) / each), k = calm ? p : p ** sharp;
          if (k >= 1) { tl.gone = true; page.left--; continue; }
          falling.push(tl, 1 - k);
        }
        both(pic => {
          for (let i = 0; i < falling.length; i += 2) {
            const tl = falling[i], m = falling[i + 1], x = X + tl.dx * m, y = Y + tl.dy * m;
            g.drawImage(pic, tl.x, tl.y, tl.w, tl.h, x - tl.w * m / 2, y - tl.h * m / 2, tl.w * m, tl.h * m);
          }
        });
      }
      // The jar blown apart: its pieces flying out, slowing, then pulled round and into the dot.
      if (t < BHI_IMPLODE) {
        for (const b of bits) {
          const fly = (1 - Math.exp(-3 * t)) / 3, ox = b.x * dpr - X + b.vx * fly, oy = b.y * dpr - Y + b.vy * fly;
          const k = smooth((t - 0.3 - b.lag) / (BHI_IMPLODE - 0.6)) ** 1.6, turn = 1.8 * k, cs = Math.cos(turn), sn = Math.sin(turn);
          if (k >= 1) continue;
          const dx = ox * (1 - k), dy = oy * (1 - k);
          put(front, b.color, X + dx * cs - dy * sn, Y + dx * sn + dy * cs);
        }
      }

      // The disk's bits: thrown out from the dot, slowing, and settling into their orbits; the
      // ones flying off keep going.
      if (tE != null && t >= tE) {
        const tau = t - tE, ct = Math.cos(HO.tilt), st = Math.sin(HO.tilt), throwK = 2.4;
        for (let i = disk.length - 1; i >= 0; i--) {
          const p = disk[i], fly = p.v * (1 - Math.exp(-throwK * tau)) / throwK;
          let fx = Math.cos(p.th) * fly, fy = Math.sin(p.th) * fly;
          // The ones flying off thin out and are gone within a second or two.
          if (p.esc) {
            fx += Math.cos(p.th) * p.v * 0.15 * tau; fy += Math.sin(p.th) * p.v * 0.15 * tau;
            const life = 0.8 + 1.2 * p.j;
            if (p.dead || tau > life || out(X + fx, Y + fy)) { p.dead = true; continue; }
            if (rnd() < (tau / life) ** 2) continue;
            put(front, heat[2 + (p.j < 0.4 ? 1 : 0)], X + fx, Y + fy);
            continue;
          }
          p.a += p.w * boost * dt;
          const rr = p.ro * r, cs = Math.cos(p.a), sn = Math.sin(p.a), ox = rr * cs, oy = rr * sn * HO.flat;
          const s = calm ? 1 : smooth((tau - 0.1) / p.ts), x = fx * (1 - s) + (ox * ct - oy * st) * s, y = fy * (1 - s) + (ox * st + oy * ct) * s;
          // Its heat: white hot near the hole, cooling to deep purple at its edge; hotter on the
          // side turning toward us (each bit a little off, so they mix).
          const e = (p.ro - inner) / (outer - inner), heatK = (1 - e) ** 1.3 * (0.75 + 0.35 * cs) + 0.25 * (p.j - 0.5);
          const bi = s < 1 ? 3 : Math.max(0, Math.min(5, Math.floor(heatK * 6.2)));
          const behind = s > 0.9 && sn < 0;
          const over = Math.hypot(x, y) < r * 1.02;
          if (!(behind && over)) put(behind ? back : front, heat[over ? Math.max(bi, 2) : bi], X + x, Y + y);
          // Its light bent round the hole: the far side up over the top, the near side (fainter,
          // some of it) under the bottom.
          if (s > 0.6 && r > 3 * px) {
            if (sn < 0) {
              const rl = r * (1.07 + 0.28 * e ** 0.8);
              put(back, heat[Math.min(5, bi + (e < 0.3 ? 1 : 0))], X + (cs * ct - sn * st) * rl, Y + (cs * st + sn * ct) * rl);
            } else if (p.j < 0.3) {
              const rl = r * (1.04 + 0.1 * e);
              put(back, heat[Math.max(0, bi - 1)], X + (cs * ct - sn * st) * rl, Y + (cs * st + sn * ct) * rl);
            }
          }
        }
      }

      flush(back);
      // The shadow: before it opens and once it has collapsed, a single dot (at night a pale one,
      // as a black dot hardly shows on the dark page).
      const lone = tC != null && t >= tC + shakeT + fallT;
      if (lone && disk.length) disk.length = 0;
      if (tE == null || t < tE) { g.globalAlpha = 1 - f; shadow(0); g.globalAlpha = f; shadow(0, '#ffffff'); g.globalAlpha = 1; }
      else if (tX == null) shadow(r, lone ? '#ffffff' : '#000');
      flush(front);
      // The photon ring: a thin bright ring just outside the shadow, shimmering.
      if (r > 3 * px) {
        const rr = r + px, n = Math.floor(2 * Math.PI * rr / px), tick = Math.floor(t * 12);
        for (let k = 0; k < n; k++) {
          if ((k * 7919 + tick * 104729) % 10 > 7) continue;
          const a = 2 * Math.PI * k / n;
          put(front, heat[Math.cos(a) > -0.3 ? 5 : 4], X + Math.cos(a) * rr, Y + Math.sin(a) * rr);
        }
        flush(front);
      }

      // The burst: a shockwave, the crystals and the dust.
      if (tX != null) {
        const tau = t - tX;
        if (tau < 0.9) {
          const sr = far * (1 - (1 - tau / 0.9) ** 4), n = Math.min(2000, Math.floor(2 * Math.PI * sr / px)), keep = 1 - tau / 0.9;
          for (let k = 0; k < n; k++) if ((k * 2654435761 % 1000) / 1000 < keep) { const a = 2 * Math.PI * k / n; put(front, cr[0], X + Math.cos(a) * sr, Y + Math.sin(a) * sr); }
        }
        for (let i = dust.length - 1; i >= 0; i--) {
          const p = dust[i];
          if (p.dead || tau > p.life) { p.dead = true; continue; }
          const d = p.v * (1 - Math.exp(-2.5 * tau)) / 2.5;
          put(front, cr[p.color], X + Math.cos(p.th) * d, Y + Math.sin(p.th) * d);
        }
        // The streaks: straight out at full speed, each a short trail of dots, until off the view.
        for (let i = streaks.length - 1; i >= 0; i--) {
          const p = streaks[i], d = p.v * tau, cs = Math.cos(p.th), sn = Math.sin(p.th);
          if (p.dead || d > far + 20) { p.dead = true; continue; }
          for (let k = 0; k < 3; k++) put(front, cr[p.color], X + cs * (d - k * px), Y + sn * (d - k * py));
        }
        for (const p of gems) {
          if (p.gone) continue;
          // Its drift and wobble die away, so by CR.settle it has come to rest.
          const q = Math.min(1, tau / CR.settle), calmK = (1 - q) ** 2;
          const d = p.v * (1 - Math.exp(-1.6 * tau)) / 1.6 + p.drift * CR.settle / 3 * (1 - (1 - q) ** 3);
          const wob = Math.sin(tau * 1.3 + p.ph) * 4 * dpr * calmK;
          const x = X + Math.cos(p.th) * d - Math.sin(p.th) * wob, y = Y + Math.sin(p.th) * d + Math.cos(p.th) * wob;
          if (out(x, y)) { p.gone = true; continue; }
          // Toward the end it turns white; a + shrinks to a single dot at its own moment in that time.
          const w0 = CR.settle - CR.whiten, k = smooth((tau - w0) / CR.whiten), tint = pale[p.color][Math.round(k * 8)];
          // A glint now and then, till it whitens: a single dot flashes into a +, with a bright heart.
          const glint = tau < w0 && (t * 2.2 + p.ph) % 3 < 0.2;
          const size = glint ? 1 : p.size && tau < w0 + CR.whiten * p.ph / 10 ? 1 : 0;
          for (let j = -size; j <= size; j++) for (let i = -size; i <= size; i++) {
            if (Math.abs(i) + Math.abs(j) > size) continue;
            put(front, i === 0 && j === 0 && glint ? cr[2] : tint, x + i * px, y + j * py);
          }
        }
        flush(front);
      }

      // The hole waits once its disk has settled: then a click on it brings it down.
      if (!idle && tE != null && t > tE + HO.settle[1] + 0.3) { idle = true; view.style.pointerEvents = 'auto'; }
      // Once the crystals are at rest (and the dust and streaks gone), all is still: nothing more
      // is drawn, and a while after, the way back shows.
      if (tX != null && t - tX > CR.settle + 0.2 && dust.every(p => p.dead) && streaks.every(p => p.dead)) { setTimeout(() => this.back(), BHI_BACK[1] * 1000); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(now => { start = last = now / 1000; frame(now); });
  },

  // The way back: white underlined text in the middle of the view, fading in; clicking it reloads
  // the page, from its top.
  back() {
    const a = document.createElement('a');
    a.className = 'bhi-back';
    a.href = location.pathname;
    a.style.fontSize = `${FONT_SIZE}px`;
    a.textContent = BHI_BACK[0];
    a.addEventListener('click', e => {
      e.preventDefault();
      history.scrollRestoration = 'manual';
      scrollTo(0, 0);
      location.reload();
    });
    document.documentElement.append(a);
    requestAnimationFrame(() => requestAnimationFrame(() => a.classList.add('shown')));
  },

  // Moves the purple's clock on to t: normally in step with time, and after a shake faster, by an
  // extra speed that dies away gradually.
  churn(c, t) {
    if (c.haze.last >= 0 && c.shakeFrom != null) c.haze.extra += (t - c.haze.last) * BHI_SHAKE[2] * Math.exp(-(t - c.shakeFrom) / BHI_CALM);
    c.haze.last = t;
  },

  // The purple swirls. While the jar shakes it rocks side to side, dying down, drawn turned on the
  // grid a few dozen times a second; when it stops, the card is drawn straight again. Once it has
  // burst, nothing more happens here.
  tick(c, t) {
    if (c.burst) return;
    const [ms, deg, , fps] = BHI_SHAKE;
    if (t < (c.shakeUntil ?? 0)) {
      if (t - (c.shakeLast ?? -1) < 1 / fps) return;
      c.shakeLast = t;
      this.churn(c, t);
      this.haze(c, t + c.haze.extra);
      const k = (t - c.shakeFrom) / (ms / 1000);
      this.turned(c, deg * (c.fury ?? 1) * Math.PI / 180 * Math.sin(k * Math.PI * 5) * (1 - k));
      c.shaken = true;
      return;
    }
    if (c.shaken) {
      c.shaken = false;
      for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++) { Cards.clear(c, col, r, 1, 1); this.cell(c, col, r); }
      for (const l of c.lines) Cards.text(c, l.text, l.col, l.row, l.color);
    }
    if (t - c.haze.last < 1 / BHI_SWIRL.fps) return;
    this.churn(c, t);
    for (const k of this.haze(c, t + c.haze.extra)) this.cell(c, k % c.cols, Math.floor(k / c.cols));
  },
};
