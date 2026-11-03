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
// Behind the sign, filling the rest of the card's width, is the town below: the near lane of a road,
// a sidewalk, a row of low shops, a tree line, skyscrapers and the sky.
//
// The sign hangs off the brick wall of a building, seen at a sharp angle left of it: its courses run
// toward a vanishing point hidden behind the sign, the bricks shortening as they recede (narrow
// screens show less of it), and short bars hold the sign to it. Only the corners of two windows
// show, one above the other: off the card's top left and bottom left, lit warm yellow at night. At
// night the sign's light tints the bricks nearest it, dimming with any segment that flickers off and
// with the arrow.
const GLASSES_COLS = 55;       // most columns the sign takes: same as Clandestine (the card is full width,
                               // the scene behind the sign filling the rest)
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
const GLASSES_SCENE = {         // the scene behind the sign, in dots from the card's bottom up:
  seed: 3,                     // which run of buildings and trees
  vp: [0.45, -0.6],            // where lines going away from us meet: × the card's width, × its height (above it: we're high up)
  road: 16, lane: 6, walk: 4,  // the road's depth, its middle line's height, the sidewalk's depth
  shops: [8, 22, 18, 40, 5, 6], // the shops' least and most height and width, how deep their roofs go, and the
                               // least difference in height between neighbours
  trees: [5, 8],               // the tree line's least and most crown radius
  towers: [12, 32, 3, 9],      // the far city's least and most building height and width
  lamps: [[0.52, -8], [0.8, 2], [0.95, 6]], // street lamps on the sidewalk's near edge: where, × the card's
                               // width, then moved this many dots (kept inside the card)
  lit: [0.5, 0.3],             // at night, the share of shops with their lights on, and of the far city's windows
  spire: [0.675, 72],           // its tall tower: where along the card (× its width), how tall
  noise: [0.07, 0.12, 0.02, 0.12], // share of dots lit on the road, the sidewalk, the ground behind the shops and the tree crowns
  sky: 0.12,                   // share of the sky's dots lit at the top
};
const GLASSES_LAMP = [         // a street lamp, dot by dot: # the lamp, O its light (lit at night)
  '..#..',
  '.###.',
  '.OOO.',
  '..O..',
  '..#..',
  '..#..',
  '..#..',
  '..#..',
  '..#..',
  '..#..',
  '..#..',
  '..#..',
  '..#..',
  '..#..',
  '.###.',
];
const GLASSES_GLOW = 6;        // px the lit tubes' light blurs out by at night

CARD_DESIGNS.glasses = {
  layout(c) {
    const [px, py] = GLASSES_PAD, cols = Math.min(c.cols, GLASSES_COLS);
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
    // The scene behind the sign shows only right of the wall, outside the panels and the arrow's cells.
    const behind = (x, y) => x >= A && Cards.cell(green, W, x >> 1, y >> 2) === '\u2800' &&
      !(x >= A && (y < GH ? x < A + gw * 2 : y >= pt * 4 && x < A + pw * 2));
    // The bar's sign letters are text cells too, drawn after the cells.
    c.sign = [];
    const scene = this.scene(W, H, behind, c.sign);
    for (const [, col, r] of c.sign) c.text.add(r * cols + col);
    Object.assign(c, { W, layers: [...scene, [wall, '--brick'], ...spill, [frame, '--window-frame'], [pane, '--window-pane'], [shade, '--faint'], [border, '--main'], [dark, '--main'], [green, '--neon'], [purple, '--neon-accent']] });
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
    // Straight on the canvas, not with Cards.text, so the sign stays out of the card's selectable text.
    c.ctx.fillStyle = c.color(c.night ? '--neon-bar' : '--neon-bar-day');
    for (const [ch, col, r] of c.sign) c.ctx.fillText(ch, (col + 0.5) * c.cellW, (r + 0.5) * c.cellH);
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

  // The scene behind the sign, W × H dots, from the bottom up: the near lane of a road (its dashed
  // middle line near the card's bottom, its curb), a sidewalk, a row of one and two story shops side
  // by side, their flat roofs seen from above, a tree line behind them, the outline of a far city
  // with a tall tower, and the sky. We look from high
  // up, so lines going away from us run toward a vanishing point above the card. Mostly outlines,
  // with a little noise for texture; each part hides what is behind it. Returns its layers, drawn
  // only where show(x, y); the letters of the bar's sign go into `letters` as [character, col, row].
  scene(W, H, show, letters) {
    const S = GLASSES_SCENE, [sh0, sh1, sw0, sw1, rd, step] = S.shops, [tr0, tr1] = S.trees, [th0, th1, tw0, tw1] = S.towers;
    const vx = S.vp[0] * W, vy = S.vp[1] * H;
    // Each part has its own run of random numbers, so changing one leaves the others as they are.
    let seed = S.seed;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647, between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const buf = () => new Uint8Array(W * H), taken = buf();
    const names = ['--neon-bar', '--scene-lane', '--scene-road', '--scene-shop', '--scene-shop-2', '--scene-shop-3', '--scene-ground', '--scene-tree', '--scene-city', '--scene-lamp', '--scene-light'];
    const night = Theme.dark;
    const layers = Object.fromEntries(names.map(n => [n, buf()]));
    const plot = (name, x, y) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && y >= 0 && x < W && y < H && !taken[y * W + x] && show(x, y)) layers[name][y * W + x] = 1;
    };
    const line = (name, ax, ay, bx, by) => {
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
      for (let i = 0; i <= n; i++) plot(name, ax + (bx - ax) * i / n, ay + (by - ay) * i / n);
    };
    const take = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) taken[y * W + x] = 1; };
    // A point `rise` dots up from (x, y) on the line from it toward the vanishing point.
    const away = (x, y, rise) => [x + (vx - x) * rise / (y - vy), y - rise];
    const noise = (name, y0, y1, share) => {
      for (let y = Math.max(0, y0); y < y1; y++) for (let x = 0; x < W; x++) if (this.hash(x + 3, y + 77) < share) plot(name, x, y);
    };
    const curb = H - S.road, back = curb - S.walk;
    // A box's outline; with `fill`, its inside too, in that color.
    const box = (name, x0, y0, x1, y1, fill) => {
      line(name, x0, y0, x1, y0); line(name, x1, y0, x1, y1); line(name, x1, y1, x0, y1); line(name, x0, y1, x0, y0);
      if (fill) for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) plot(fill, x, y);
    };

    // Street lamps on the sidewalk's near edge, in front of everything, drawn from GLASSES_LAMP: a
    // cap, a lantern and a bulb under it (lit at night), a thin post and a foot.
    for (const [f, move] of S.lamps) {
      const lx = Math.max(0, Math.min(W - GLASSES_LAMP[0].length, Math.round(f * W) - 2 + move)), top = curb - GLASSES_LAMP.length;
      GLASSES_LAMP.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        plot(ch === 'O' && night ? '--scene-light' : '--scene-lamp', lx + x, top + y);
        take(lx + x, top + y);
      }));
    }

    // The road: its middle line dashed, the curb, the sidewalk's back edge, its joints running away
    // from us, and noise on both.
    for (let x = 0; x < W; x++) {
      if (x % 10 < 6) plot('--scene-lane', x, H - S.lane);
      plot('--scene-road', x, curb);
      plot('--scene-road', x, back);
    }
    for (let x = 0; x < W; x += 16) line('--scene-road', x, curb, ...away(x, curb, S.walk));
    noise('--scene-road', curb + 1, H, S.noise[0]);
    noise('--scene-road', back + 1, curb, S.noise[1]);
    for (let y = back; y < H; y++) for (let x = 0; x < W; x++) take(x, y);

    // Shops along the sidewalk, side by side, each in one of a few colors: a front, and the flat
    // roof seen from above, its sides running away from us. Neighbours differ in height. Each front
    // has a storefront: a sign band (or, on two story shops, a floor line and a row of windows above),
    // a door on one side, a display window, and on some an awning. At night some shops have their
    // lights on, their windows yellow. (Their looks come from the shop's place in the row, not the
    // run of random numbers, so they don't change the shops' sizes.)
    let roofs = back, last = 0, seen = 0, sign = null;
    for (let x = 0, n = 0; x < W; n++) {
      let h;
      do h = between(sh0, sh1); while (Math.abs(h - last) < step);
      last = h;
      const w = between(sw0, sw1);
      // The second shop in view is a bar: two stories, its door on the left. On its left wall
      // hangs a sign reading B, A, R down one column of cells (sc, from row r0) in an outline, its
      // foot above the door's top, rising over the roof; it is drawn once the town is, in front of it.
      const bar = show(x + w / 2, back - 2) && ++seen === 2;
      const sc = x >> 1, r0 = ((back - 6) >> 2) - 3;
      if (bar) {
        h = 18;
        sign = [2 * sc - 1, 4 * r0 - 1, 2 * sc + 2, 4 * r0 + 12];
        [...'BAR'].forEach((ch, k) => letters.push([ch, sc, r0 + k]));
      }
      const top = back - h, color = ['--scene-shop', '--scene-shop-2', '--scene-shop-3'][between(0, 2)];
      const [lx, ly] = away(x, top, rd), [rx] = away(x + w, top, rd);
      line(color, x, top, x, back); line(color, x + w, top, x + w, back);
      line(color, x, top, x + w, top); line(color, lx, ly, rx, ly);
      line(color, x, top, lx, ly); line(color, x + w, top, rx, ly);
      const pick = k => this.hash(n * 31 + k, 7), on = night && pick(1) < S.lit[0] && '--scene-light';
      const two = h >= 16, floor = two ? back - Math.floor(h / 2) : top;
      if (two) {
        line(color, x, floor, x + w, floor);
        for (let k = bar ? 2 * sc + 5 : x + 3; k + 2 <= x + w - 2; k += 5) box(color, k, top + 2, k + 2, top + 5, on); // (the bar's right of its sign)
      } else line(color, x + 1, floor + 2, x + w - 1, floor + 2);
      // The door on the left or the right (the bar's right of its sign's foot), and the display window beside it.
      const left = bar || pick(2) < 0.5, dx = bar ? 2 * sc + 4 : left ? x + 2 : x + w - 5, dTop = Math.max(floor + 4, back - 7);
      box(color, dx, dTop, dx + 3, back, on);
      const wx0 = left ? dx + 5 : x + 2, wx1 = left ? x + w - 2 : dx - 2, wTop = Math.max(floor + 4, back - 6);
      if (wx1 - wx0 >= 4) {
        box(color, wx0, wTop, wx1, back - 1, on);
        if (pick(3) < 0.4) for (let k = wx0; k <= wx1; k++) { plot(color, k, wTop - 1); if (k % 2) plot(color, k, wTop - 2); } // an awning
        else if (pick(4) < 0.5) line(color, (wx0 + wx1) >> 1, wTop, (wx0 + wx1) >> 1, back - 1);              // or a mullion
      }
      for (let y = Math.floor(ly); y <= back; y++) {
        const t = Math.max(0, (top - y) / rd), a = x + (lx - x) * t, b = x + w + (rx - x - w) * t;
        for (let k = Math.floor(a); k <= Math.ceil(b); k++) take(k, y);
      }
      roofs = Math.min(roofs, ly);
      x += w;
    }

    // The tree line, above the shops: round crowns in a row, overlapping each other, outlined, with a
    // few leaves inside; below them a little ground shows.
    const treeline = back - sh1 - rd - 2;
    const crowns = [];
    seed = S.seed + 1;
    for (let x = 0; x < W + tr1; x += between(tr0, tr1)) crowns.push([x, treeline - between(0, 3), between(tr0, tr1)]);
    const inCrowns = (x, y) => crowns.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r);
    for (let y = Math.max(0, treeline - tr1 - 3); y < back; y++) {
      for (let x = 0; x < W; x++) {
        if (!inCrowns(x, y)) continue;
        if (!inCrowns(x, y - 1) || this.hash(x + 9, y + 41) < S.noise[3]) plot('--scene-tree', x, y);
      }
    }
    for (let y = Math.max(0, treeline - tr1 - 3); y < back; y++) for (let x = 0; x < W; x++) if (inCrowns(x, y)) take(x, y);
    noise('--scene-ground', treeline, back, S.noise[2]);
    for (let y = treeline; y < back; y++) for (let x = 0; x < W; x++) take(x, y);

    // The far city: its outline only, the top of a dense skyline. A continuous row of lower
    // buildings with no gaps, and over it skyscrapers of every height and width, close together:
    // some flat topped, some pointed, some stepping in near the top, some with a mast; and a tall
    // tower: a thin shaft, a wide pod, and a mast.
    const ground = treeline, sky = new Array(W).fill(ground);
    const raise = (x, y) => { x = Math.round(x); if (x >= 0 && x < W) sky[x] = Math.min(sky[x], Math.round(y)); };
    const mid = Math.round((th0 + th1) / 2);
    seed = S.seed + 2;
    for (let x = 0; x < W; ) {
      const w = between(tw0 + 1, tw1 + 2), top = ground - between(th0, mid);
      for (let k = 0; k <= w; k++) raise(x + k, top);
      x += w;
    }
    for (let x = between(0, 3); x < W; x += between(1, Math.ceil(tw1 / 2))) {
      const w = between(tw0, tw1), top = ground - (rnd() < 0.15 ? between(th1, Math.round(th1 * 1.4)) : between(mid, th1)), kind = rnd();
      for (let k = 0; k <= w; k++) {
        const inset = Math.min(k, w - k);
        if (kind < 0.15) raise(x + k, top - Math.min(inset, w / 2));                    // pointed
        else if (kind < 0.35) raise(x + k, inset >= w / 4 ? top - 4 : top);             // stepping in
        else raise(x + k, top);
      }
      if (kind > 0.85) for (let y = top - 6; y < top; y++) raise(x + Math.round(w / 2), y); // a mast
    }
    for (let x = 0; x < W; x++) {
      if (sky[x] < ground) plot('--scene-city', x, sky[x]);
      // Where the next column's top differs, a side: down from this one's top where the next is
      // lower, or up to the next one's top where it is higher.
      if (x + 1 === W) break;
      const next = sky[x + 1], side = next > sky[x] ? x : x + 1;
      if (next !== sky[x]) line('--scene-city', side, Math.min(sky[x], next), side, Math.max(sky[x], next));
    }
    // At night, a pattern of lit windows across the city: a grid, some of its windows on.
    if (night) {
      for (let x = 0; x < W; x++) {
        for (let y = sky[x] + 2; y < ground; y++) if (x % 3 === 1 && (ground - y) % 3 === 2 && this.hash(x + 19, y + 3) < S.lit[1]) plot('--scene-light', x, y);
      }
    }
    for (let x = 0; x < W; x++) for (let y = sky[x]; y < ground; y++) take(x, y);

    // The tall tower behind the buildings, outlined on its own so its pod shows whole: the mast, the
    // pod (rounded, widest in its middle), and the shaft, a little wider at its foot.
    const [sf, sh] = S.spire, sx = Math.round(sf * W), sTop = ground - sh;
    const half = y => {
      const u = (y - sTop) / sh, pod = 1 - Math.abs(u - 0.3) / 0.05;
      return u < 0 || u >= 1 ? -1 : u < 0.2 ? 0 : pod > 0 ? Math.round(2 + 4 * Math.sqrt(pod)) : u > 0.85 ? 2 : 1;
    };
    const inTower = (x, y) => Math.abs(x - sx) <= half(y);
    for (let y = sTop; y < ground; y++) {
      for (let x = sx - 8; x <= sx + 8; x++) {
        if (inTower(x, y) && (!inTower(x - 1, y) || !inTower(x + 1, y) || !inTower(x, y - 1) || !inTower(x, y + 1) || half(y) === 0)) plot('--scene-city', x, y);
      }
    }
    for (let y = sTop; y < ground; y++) for (let x = sx - 8; x <= sx + 8; x++) if (inTower(x, y)) take(x, y);

    // The bar's sign, in front of everything behind it: its outline, nothing else inside it.
    if (sign) {
      const [x0, y0, x1, y1] = sign;
      for (let y = Math.max(0, y0); y <= y1; y++) {
        for (let k = Math.max(0, x0); k <= Math.min(W - 1, x1); k++) {
          const i = y * W + k;
          for (const n of names) layers[n][i] = 0;
          taken[i] = 1;
          if ((y === y0 || y === y1 || k === x0 || k === x1) && show(k, y)) layers['--neon-bar'][i] = 1;
        }
      }
    }

    // The sky: sparse dots, more of them higher up.
    const sky0 = buf(), sky1 = buf();
    for (let y = 0; y < ground; y++) {
      for (let x = 0; x < W; x++) {
        if (taken[y * W + x] || !show(x, y)) continue;
        const u = 1 - y / ground;
        if (this.hash(x + 13, y + 29) < S.sky * u * u) (u > 0.6 ? sky1 : sky0)[y * W + x] = 1;
      }
    }
    return [[sky0, '--sky-pale'], [sky1, '--sky-light'], ...names.map(n => [layers[n], n])];
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
    g.fillStyle = c.color('--neon-bar');
    for (const [ch, col, r] of c.sign) for (let k = 0; k < 2; k++) g.fillText(ch, (col + 0.5) * c.cellW, (r + 0.5) * c.cellH);
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

