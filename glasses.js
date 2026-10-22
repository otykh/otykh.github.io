// AR Glasses card: a neon sign in two panels mounted on a wall to its left. The top panel's
// green tube frames the title (dark), "personal project" and the year (gray). A thin green neon arrow
// hangs off the panel: down its right side, round the corner and left under it, between it and the
// panel below, its head poking out past their left edges. Under it, a slimmer panel's purple tube
// frames the description, which wraps around a solid purple pair of glasses in its top right. Each panel is a backboard with a gray border right outside its tube, its
// inside shaded gray with noisy dots; tubes are drawn in lit segments with short dark gaps, like real
// neon, two dots thick. By day the tubes are a softer green and purple, without glow. At night (the
// dark theme) they are bright and glow, now and then one segment of tube flickers for a while, and the green
// arrow switches on and off. The green panel is only as wide as its text.
//
// The sign hangs off the brick wall of a building, seen at a sharp angle left of it: its courses run
// toward a vanishing point hidden behind the sign, the bricks shortening as they recede (narrow
// screens show less of it), and short bars hold the sign to it. Only the corners of two windows
// show, one above the other: off the card's top left and bottom left, lit warm yellow at night. At
// night the sign's light tints the bricks nearest it, dimming with any segment that flickers off and
// with the arrow.
const GLASSES_COLS = 55;       // most columns wide: same as Clandestine
const GLASSES_PAD = [3, 2];    // cells between a panel's edge and its text: columns, rows
const GLASSES_SLIM = 0.13;     // how much narrower the purple panel is than the green one, × the card's width
const GLASSES_INSET = 1;       // dots from a panel's border to its tube (1 = right beside it)
const GLASSES_ROUND = 3;       // dots the tubes' corners are rounded by
const GLASSES_SEGMENT = [22, 2]; // tube segments: dots lit, then dots dark
const GLASSES_ICON = [[18, 3], [11, 2], 30]; // glasses: size in cells (columns, rows), smaller size, text width below which the smaller is used
const GLASSES_LINK = '\u21AA\uFE0E'; // hooked arrow after the title, linking to a photo of the glasses
const GLASSES_SHADE = 0.12;    // share of a panel's inside dots shaded gray
const GLASSES_FLICKER = [[4, 10], [1.5, 3], 0.5, [0.08, 0.3]]; // one segment at a time: seconds between flickers, how long one lasts (s), share of it off, how long each off/on state holds (s)
const GLASSES_WALL = { cols: 8, angle: 14, depth: 200, horizon: 0.5, brick: [18, 8], windows: [[-9, 0.6, -1, 0.12], [-9, 0.6, 0.88, 2]] };
                               // the wall: columns left of the sign for it, degrees we see it at (sharper
                               // puts the vanishing point nearer), dots to the vanishing point at 45°, its
                               // height × the card's, a brick's length and height in dots at the card's
                               // left edge, and windows: from and to how many bricks in, from and to what
                               // height (× the card's, at its left edge); mostly out of view
const GLASSES_ARROW = 1;       // seconds the green arrow stays on, then off
const GLASSES_HEAD = [3, 4];   // the arrow: columns left of the panels for its head, dots thick
const GLASSES_SPILL = [16, 0.6]; // at night, the panels' light on the wall: dots it reaches from their left
                               // tubes, and how far it tints the nearest bricks toward the tube's color
const GLASSES_GLOW = 6;        // px the lit tubes' light blurs out by at night

CARD_DESIGNS.glasses = {
  max: GLASSES_COLS,
  left: true,

  layout(c) {
    const [px, py] = GLASSES_PAD, { cols } = c;
    const [kind, title, year, ...description] = c.fields.map(f => f[1]);
    // The wall in columns [0, wc), then the arrow's head; the panels start at column ai. Green panel:
    // cols [ai, ai + gw), rows [0, gh). Two rows for the arrow under it, then the purple panel: cols
    // [ai, ai + pw), rows [pt, rows). Narrow screens give the wall the room the purple panel would
    // leave on its right, so the panel reaches the card's right edge.
    const slim = Math.round(cols * GLASSES_SLIM);
    c.wc = c.wide ? GLASSES_WALL.cols : slim;
    const ai = c.ai = c.wc + GLASSES_HEAD[0], x0 = ai + px;
    c.gh = py * 2 + 3;
    c.pt = c.gh + 2;
    c.pw = cols - ai - (c.wide ? slim : 0);
    const tw = c.pw - 2 * px;
    // The glasses in the purple panel's top right; lines beside them are shortened to wrap around.
    const [big, small, narrow] = GLASSES_ICON, [iw, ih] = tw < narrow ? small : big;
    c.icon = { col: ai + c.pw - px - iw, row: c.pt + py, w: iw, h: ih };
    // Lines beside the glasses, and one more under them, are shortened.
    const width = r => r <= c.icon.row + c.icon.h ? tw - iw - 1 : tw;
    let row = c.pt + py;
    const paragraphs = description.flatMap((d, k) => {
      if (k) row++;
      const out = [];
      let line = '';
      for (const word of d.split(' ')) {
        if (line && line.length + 1 + word.length > width(row)) { out.push({ text: line, row: row++, col: x0, color: '--main' }); line = ''; }
        line += (line ? ' ' : '') + word;
      }
      if (line) out.push({ text: line, row: row++, col: x0, color: '--main' });
      return out;
    });
    row = Math.max(row, c.icon.row + c.icon.h + 1);
    c.lines = [
      { text: title, row: py, col: x0, color: '--main' },
      { text: GLASSES_LINK, row: py, col: x0 + title.length + 1, color: '--link' },
      { text: kind, row: py + 1, col: x0, color: '--secondary' },
      { text: year, row: py + 2, col: x0, color: '--secondary' },
      ...paragraphs,
    ];
    // Wide enough for the text and the link icon, leaving room on its right for the arrow.
    c.gw = Math.min(cols - ai - 3, px + Math.max(title.length + 2, kind.length, year.length) + px);
    return row + py;
  },

  draw(c) {
    const { cols, rows, gh, gw, pw, pt, ai, wc, lines } = c;
    const W = cols * 2, H = rows * 4, GH = gh * 4, A = ai * 2;
    const layer = () => new Uint8Array(W * H);
    const border = layer(), shade = layer(), dark = layer(), green = layer(), purple = layer();
    const wall = layer(), frame = layer(), pane = layer();
    const [lit, gap] = GLASSES_SEGMENT, d = GLASSES_INSET;

    const line = (plot, ax, ay, bx, by) => {
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let i = 0; i <= n; i++) plot(Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n));
    };
    // A neon path: every `lit` dots followed by `gap` dark ones. Each lit run is a segment: its dots,
    // which path it is on and which tube (paths drawn side by side to make one thick tube).
    const segs = [], segAt = new Int32Array(W * H).fill(-1);
    let paths = 0;
    const neon = (buf, tube) => {
      let k = 0, seg = -1;
      const path = paths++;
      return (x, y) => {
        const i = y * W + x, on = k++ % (lit + gap) < lit;
        (on ? buf : dark)[i] = 1;
        if (!on) { seg = -1; return; }
        if (seg < 0) { seg = segs.length; segs.push({ dots: [], path, tube }); }
        segs[seg].dots.push(i);
        segAt[i] = seg;
      };
    };
    // A rounded rectangle, going round from its top left.
    const rounded = (plot, x0, y0, x1, y1, rd) => {
      line(plot, x0 + rd, y0, x1 - rd, y0); line(plot, x1 - rd + 1, y0 + 1, x1 - 1, y0 + rd - 1);
      line(plot, x1, y0 + rd, x1, y1 - rd); line(plot, x1 - 1, y1 - rd + 1, x1 - rd + 1, y1 - 1);
      line(plot, x1 - rd, y1, x0 + rd, y1); line(plot, x0 + rd - 1, y1 - 1, x0 + 1, y1 - rd + 1);
      line(plot, x0, y1 - rd, x0, y0 + rd); line(plot, x0 + 1, y0 + rd - 1, x0 + rd - 1, y0 + 1);
    };

    // Each panel: a border on its outer dots, gray noise inside, and its tube a little in.
    const panel = (x0, y0, x1, y1, tube) => {
      const edge = (x, y) => { border[y * W + x] = 1; };
      line(edge, x0, y0, x1, y0); line(edge, x1, y0, x1, y1); line(edge, x1, y1, x0, y1); line(edge, x0, y1, x0, y0);
      for (let y = y0 + 1; y < y1; y++) {
        for (let x = x0 + 1; x < x1; x++) if (this.hash(x, y) < GLASSES_SHADE) shade[y * W + x] = 1;
      }
      rounded(neon(tube, tube), x0 + d, y0 + d, x1 - d, y1 - d, GLASSES_ROUND);
      rounded(neon(tube, tube), x0 + d + 1, y0 + d + 1, x1 - d - 1, y1 - d - 1, GLASSES_ROUND - 1);
    };
    panel(A, 0, A + gw * 2 - 1, GH - 1, green);
    panel(A, pt * 4, A + pw * 2 - 1, H - 1, purple);

    // The glasses, solid purple, like square-framed sunglasses seen from the front: a straight bar
    // across the top joining both lenses; each lens's outer side runs nearly straight down, its
    // inner side slants away from the bridge, and its bottom is flat with large rounded corners.
    // Raised half a cell, so they sit a little above the first line of text.
    const ic = c.icon, IW = ic.w * 2, IH = ic.h * 4, ix = ic.col * 2, iy = ic.row * 4 - 2;
    const inGlasses = (px, t) => {
      const half = Math.min(px, 1 - px);
      // Above each lens the top rises in a low arch, highest over the lens's middle.
      if (t < 0) return t > -0.12 * (1 - ((half - 0.235) / 0.21) ** 2);
      if (t < 0.18) return px > 0.01 && px < 0.99;
      const outer = 0.01 + 0.04 * t * t, inner = 0.455 - 0.07 * t ** 1.5;
      // The nose gap's top corners are filled a little, so it opens as an arch under the bridge.
      if (half > inner) return t < 0.18 + 0.22 * ((0.5 - half) / (0.5 - inner)) ** 2;
      if (half < outer) return false;
      const dx = Math.abs(2 * (half - outer) / (inner - outer) - 1), dy = Math.max(0, (t - 0.45) / 0.55);
      return dx ** 4 + dy ** 4 < 1;
    };
    for (let y = -2; y < IH; y++) {
      for (let x = 0; x < IW; x++) if (inGlasses((x + 0.5) / IW, (y + 0.5) / IH)) purple[(iy + y) * W + ix + x] = 1;
    }

    // The arrow: down beside the green panel from its title's row, a square corner, then left along
    // the rows between the panels to a solid head in the columns left of them, its sides at 45°,
    // fitting snugly against their corners.
    const T = GLASSES_HEAD[1], xv = A + gw * 2 + 1, yb = GH + 2, yT = GLASSES_PAD[1] * 4, tip = wc * 2;
    for (let d = 0; d < T; d++) {
      const plot = neon(green, 'arrow');
      line(plot, xv + d, yT, xv + d, yb + d);
      line(plot, xv + d - 1, yb + d, A, yb + d);
    }
    const head = [];
    for (let i = 0; tip + i < A; i++) {
      for (let y = yb - i; y <= yb + T - 1 + i; y++) { green[y * W + tip + i] = 1; head.push(y * W + tip + i); }
    }

    // The wall's bricks, drawn by their mortar: the courses' lines, evenly spaced at the card's left
    // edge, running toward the vanishing point, and between them the joints at each brick's end, the
    // bricks shortening as they recede (every other course shifted half a brick). Only left of the
    // panels, and not in cells of the arrow's head. The windows have a gray frame round whitish panes.
    if (wc) {
      const { angle, depth, horizon, brick: [L, B], windows } = GLASSES_WALL;
      const vx = depth * Math.tan(angle * Math.PI / 180), vy = horizon * H, k = vx / L;
      const open = (x, y) => x >= 0 && x < A && y >= 0 && y < H && Cards.cell(green, W, x >> 1, y >> 2) === '\u2800';
      const plotWall = (x, y) => { if (open(x, y)) wall[y * W + x] = 1; };
      // The height of course line j at x.
      const at = (j, x) => Math.round(vy + j * B + (vy - (vy + j * B)) * x / vx);
      for (let j = -Math.ceil(5 * H / B); j <= 5 * H / B; j++) {
        line(plotWall, 0, at(j, 0), Math.round(vx), Math.round(vy));
        // Brick ends: u bricks in, at x = vx·u / (u + k), which is L dots per brick at the left edge.
        for (let n = 1; ; n++) {
          const u = n - (j & 1) / 2, x = Math.round(vx * u / (u + k));
          if (x >= A) break;
          line(plotWall, x, at(j, x), x, at(j + 1, x));
        }
      }
      // A dot's place on the wall: how many bricks in, and the height (× the card's) at the card's
      // left edge of the line through it toward the vanishing point.
      const inWindow = (x, y) => {
        const u = k * x / (vx - x), h = (y - vy * x / vx) / (1 - x / vx) / H;
        return windows.some(([u0, u1, h0, h1]) => u >= u0 && u < u1 && h >= h0 && h < h1);
      };
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < A; x++) {
          if (!open(x, y)) continue;
          const i = y * W + x;
          if (!inWindow(x, y)) continue;
          wall[i] = 0;
          // The frame, two dots thick, where the window meets the wall (not where the card cuts it).
          const edge = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            return nx >= 0 && ny >= 0 && ny < H && nx < A && !inWindow(nx, ny);
          });
          // By day every other dot, so the pane reads as glass; at night all of them, the light on.
          if (edge) frame[i] = 1;
          else if (Theme.dark || (x + y) & 1) pane[i] = 1;
        }
      }
    }

    // What flickers together: the segments of a tube's side-by-side paths that run beside each
    // other (each joins the one on another path its dots touch most), so the whole thickness goes
    // off at once; and the arrow as one.
    const root = segs.map((_, k) => k), find = k => root[k] === k ? k : (root[k] = find(root[k]));
    segs.forEach((sg, k) => {
      if (sg.tube === 'arrow') { root[find(k)] = find(segs.findIndex(o => o.tube === 'arrow')); return; }
      const votes = new Map();
      for (const i of sg.dots) {
        for (const o of [-1, 1, -W, W]) {
          const n = segAt[i + o];
          if (n >= 0 && segs[n].tube === sg.tube && segs[n].path !== sg.path) votes.set(n, (votes.get(n) || 0) + 1);
        }
      }
      const best = [...votes].sort((a, b) => b[1] - a[1])[0];
      if (best) root[find(k)] = find(best[0]);
    });
    const groups = new Map();
    segs.forEach((sg, k) => {
      const r = find(k);
      if (!groups.has(r)) groups.set(r, { dots: [], arrow: sg.tube === 'arrow', color: sg.tube === purple ? '--neon-accent' : '--neon', until: 0, next: 0, off: false });
      groups.get(r).dots.push(...sg.dots);
    });
    c.segs = [...groups.values()];
    c.arrowSeg = c.segs.find(g => g.arrow);
    c.arrowSeg.dots.push(...head);
    for (const g of c.segs) g.cells = new Set(g.dots.map(i => (Math.floor(i / W) >> 2) * cols + ((i % W) >> 1)));
    c.flicker = null;
    c.flickerNext = 0;

    // Text cells show only their letters.
    c.text = new Set();
    for (const l of lines) for (let i = 0; i < l.text.length; i++) c.text.add(l.row * cols + l.col + i);
    // At night the sign lights up the wall beside it: each segment of tube at the panels' left edges,
    // and the arrow's head, tints the brick lines near it toward its color, more the nearer they are,
    // in three steps. Each brick dot keeps what every segment gives it, so a segment flickering off
    // (or the arrow switching off) takes its light away; the brightest lit segment sets the tint.
    const spill = [];
    c.spill = null;
    if (wc && Theme.dark) {
      const [reach, most] = GLASSES_SPILL;
      const bufs = {};
      for (const color of ['--neon', '--neon-accent']) {
        bufs[color] = [1, 2, 3].map(k => layer());
        bufs[color].forEach((b, k) => spill.push([b, Cards.mix(c.color('--brick'), c.color(color), most * (k + 1) / 3)]));
      }
      const sources = c.segs.map(g => g.dots.filter(i => i % W < A + d + 2)).map((pts, k) => [c.segs[k], pts]).filter(([, pts]) => pts.length);
      const of = new Map();
      for (let i = 0; i < W * H; i++) {
        if (!wall[i]) continue;
        const px = i % W, py = Math.floor(i / W), gets = [];
        for (const [g, pts] of sources) {
          let near = 0;
          for (const j of pts) near = Math.max(near, 1 - Math.hypot(j % W - px, Math.floor(j / W) - py) / reach);
          if (near > 0) { gets.push([g, near]); (g.lights ??= []).push(i); }
        }
        if (gets.length) of.set(i, gets);
      }
      c.spill = { wall, bufs, of };
      for (const i of of.keys()) this.light(c, i);
    }
    Object.assign(c, { W, layers: [[wall, '--brick'], ...spill, [frame, '--window-frame'], [pane, '--window-pane'], [shade, '--faint'], [border, '--main'], [dark, '--main'], [green, '--neon'], [purple, '--neon-accent']] });
    c.offDots = new Uint8Array(W * H);
    c.night = Theme.dark;
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) this.cell(c, col, r);
    // Bars holding the sign to the wall, from the panels' left edges past the arrow's head and a
    // cell into the wall, where each ends in a flat plate standing up and down from it (drawn after
    // the cells, in front of the wall): one for the green panel, two for the purple one, near its
    // top and bottom.
    if (wc) {
      const bw = (ai - wc + 1) * 2, x0 = wc - 1;
      for (const r of [Math.floor(gh / 2), pt + 2, rows - 3]) {
        // The bar and its plate in dots, over the bar's row and the rows above and below it.
        const buf = new Uint8Array(bw * 12);
        for (let x = 0; x < bw; x++) buf[5 * bw + x] = buf[6 * bw + x] = 1;
        for (let y = 2; y < 10; y++) buf[y * bw] = 1;
        Cards.clear(c, x0, r, bw / 2, 1);
        for (let k = 0; k < 3; k++) {
          for (let col = 0; col < bw / 2; col++) {
            const ch = Cards.cell(buf, bw, col, k);
            if (ch !== '\u2800') Cards.text(c, ch, x0 + col, r - 1 + k, '--secondary');
          }
        }
      }
    }
    this.glow(c);
    for (const l of lines) Cards.text(c, l.text, l.col, l.row, l.color);
    c.cellLinks.push([lines[1].col, lines[1].row, 1, 'Photo of the AR glasses']);
  },

  // Draws one cell: each layer in its own pass, so a cell can hold dots of several colors. By day the
  // neon is drawn in softer colors; at night, dots of a segment flickering off are drawn unlit.
  cell(c, col, r) {
    if (c.text.has(r * c.cols + col)) return;
    Cards.clear(c, col, r, 1, 1);
    for (const [buf, color] of c.layers) {
      const neon = color.startsWith('--neon');
      if (neon && !c.night) {
        const ch = Cards.cell(buf, c.W, col, r);
        if (ch !== '\u2800') Cards.text(c, ch, col, r, `${color}-day`);
        continue;
      }
      const ch = Cards.cell(buf, c.W, col, r, neon ? c.offDots : null);
      if (ch !== '\u2800') Cards.text(c, ch, col, r, color);
      if (!neon) continue;
      const unlit = this.unlit(c, buf, col, r);
      if (unlit !== '\u2800') Cards.text(c, unlit, col, r, '--neon-off');
    }
  },

  // Tints brick dot i by the brightest lit segment that reaches it (or leaves it plain brick).
  light(c, i) {
    const { wall, bufs, of } = c.spill;
    let best = null;
    for (const [g, near] of of.get(i)) if (!g.off && (!best || near > best[1])) best = [g, near];
    wall[i] = best ? 0 : 1;
    for (const color in bufs) for (const b of bufs[color]) b[i] = 0;
    if (best) bufs[best[0].color][Math.min(2, Math.floor(best[1] * 3))][i] = 1;
  },

  // The braille character for a layer's dots in a cell that belong to segments flickering off.
  unlit(c, buf, col, r) {
    let bits = 0;
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const i = (r * 4 + dy) * c.W + col * 2 + dx;
        if (buf[i] && c.offDots[i]) bits |= DOT_BIT[dy][dx];
      }
    }
    return String.fromCharCode(0x2800 + bits);
  },

  // At night, the lit tubes' light: their dots again on a canvas behind the card, blurred. Redrawn
  // whole when a segment flickers; cleared by day.
  glow(c) {
    if (!c.glowCanvas) {
      c.glowCanvas = document.createElement('canvas');
      c.glowCanvas.className = 'neon-glow';
      c.glowCanvas.setAttribute('aria-hidden', 'true');
      c.glowCanvas.style.filter = `blur(${GLASSES_GLOW}px)`;
      c.canvas.before(c.glowCanvas);
    }
    const g = c.glowCanvas.getContext('2d'), w = c.canvas.width, h = c.canvas.height;
    if (c.glowCanvas.width !== w || c.glowCanvas.height !== h) {
      Object.assign(c.glowCanvas, { width: w, height: h });
      Object.assign(c.glowCanvas.style, { width: c.canvas.style.width, height: c.canvas.style.height });
    }
    g.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!c.night) return;
    g.font = `${FONT_SIZE}px ${c.font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const [buf, color] of c.layers) {
      if (!color.startsWith('--neon')) continue;
      g.fillStyle = c.color(color);
      for (let r = 0; r < c.rows; r++) {
        for (let col = 0; col < c.cols; col++) {
          const ch = Cards.cell(buf, c.W, col, r, c.offDots);
          // Drawn twice over, for a stronger light.
          if (ch !== '\u2800') for (let k = 0; k < 2; k++) g.fillText(ch, (col + 0.5) * c.cellW, (r + 0.5) * c.cellH);
        }
      }
    }
  },

  // A fixed pseudo-random value 0..1 for a dot position.
  hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },

  // At night: now and then one segment of tube flickers for a while, going off and on at random,
  // and the arrow switches on and off. Only cells of segments that change are redrawn, and the glow
  // with them.
  tick(c, t) {
    if (!c.night) return;
    const [[w0, w1], [d0, d1], share, [h0, h1]] = GLASSES_FLICKER, rnd = (a, b) => a + Math.random() * (b - a);
    const dirty = new Set();
    const set = (seg, off) => {
      if (off === seg.off) return;
      seg.off = off;
      for (const i of seg.dots) c.offDots[i] = off ? 1 : 0;
      for (const cell of seg.cells) dirty.add(cell);
      // The wall it lights dims with it.
      if (c.spill && seg.lights) {
        for (const i of seg.lights) { this.light(c, i); dirty.add((Math.floor(i / c.W) >> 2) * c.cols + ((i % c.W) >> 1)); }
      }
    };
    if (!c.flicker && t >= c.flickerNext) {
      const tubes = c.segs.filter(g => !g.arrow);
      c.flicker = tubes[Math.floor(Math.random() * tubes.length)];
      c.flicker.until = t + rnd(d0, d1);
    }
    const f = c.flicker;
    if (f && t >= f.until) { set(f, false); c.flicker = null; c.flickerNext = t + rnd(w0, w1); }
    // During a flicker the segment holds each off or on state for a moment, so it's visible.
    else if (f && t >= f.next) { set(f, Math.random() < share); f.next = t + rnd(h0, h1); }
    set(c.arrowSeg, Math.floor(t / GLASSES_ARROW) % 2 === 1);
    for (const cell of dirty) this.cell(c, cell % c.cols, Math.floor(cell / c.cols));
    if (dirty.size) this.glow(c);
  },
};

