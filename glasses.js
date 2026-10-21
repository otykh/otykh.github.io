// AR Glasses card: a neon sign in two panels mounted on the wall to its left. The top panel's
// green tube frames the title (dark), "personal project" and the year (gray), and a green neon arrow runs down right after
// them, bends, and runs left under them to point left. Right under it, a slimmer panel's purple tube
// frames the description, which wraps around a solid purple pair of glasses in its top right. Each panel is a backboard with a gray border right outside its tube, its
// inside shaded gray with noisy dots; tubes are drawn in lit segments with short dark gaps, like real
// neon, two dots thick, and now and then a segment flickers off for a moment. The green panel is only as wide as its title and arrow. Metal bars hold the panels to the screen's left edge: a thick one for the green panel, two
// for the purple one.
const GLASSES_COLS = 55;       // most columns wide: same as Clandestine
const GLASSES_PAD = [3, 2];    // cells between a panel's edge and its text: columns, rows
const GLASSES_SLIM = 0.13;     // how much narrower the purple panel is than the green one, × the card's width
const GLASSES_INSET = 1;       // dots from a panel's border to its tube (1 = right beside it)
const GLASSES_ROUND = 3;       // dots the tubes' corners are rounded by
const GLASSES_SEGMENT = [22, 2]; // tube segments: dots lit, then dots dark
const GLASSES_ICON = [[18, 3], [11, 2], 30]; // glasses: size in cells (columns, rows), smaller size, text width below which the smaller is used
const GLASSES_LINK = '\u21AA\uFE0E'; // hooked arrow after the title, linking to a photo of the glasses
const GLASSES_SHADE = 0.12;    // share of a panel's inside dots shaded gray
const GLASSES_FLICKER = [0, [0.3, 1.2], 0.5, [0.05, 0.15]]; // per segment: flickers per second (0 = off; 0.04 looked right), how long one lasts (s), share of it off, how long each off/on state holds (s)

CARD_DESIGNS.glasses = {
  max: GLASSES_COLS,
  left: true,
  mounted: true,

  layout(c) {
    const [px, py] = GLASSES_PAD, { gutter, cols } = c;
    const [kind, title, year, ...description] = c.fields.map(f => f[1]);
    // Green panel: cols [0, gw), rows [0, gh). Purple panel: cols [0, pw), rows [gh, rows).
    c.gh = py * 2 + 5;
    c.pw = cols - Math.round(cols * GLASSES_SLIM);
    const tw = c.pw - 2 * px;
    // The glasses in the purple panel's top right; lines beside them are shortened to wrap around.
    const [big, small, narrow] = GLASSES_ICON, [iw, ih] = tw < narrow ? small : big;
    c.icon = { col: c.pw - px - iw, row: c.gh + py, w: iw, h: ih };
    // Lines beside the glasses, and one more under them, are shortened.
    const width = r => r <= c.icon.row + c.icon.h ? tw - iw - 1 : tw;
    let row = c.gh + py;
    const paragraphs = description.flatMap((d, k) => {
      if (k) row++;
      const out = [];
      let line = '';
      for (const word of d.split(' ')) {
        if (line && line.length + 1 + word.length > width(row)) { out.push({ text: line, row: row++, col: gutter + px, color: '--main' }); line = ''; }
        line += (line ? ' ' : '') + word;
      }
      if (line) out.push({ text: line, row: row++, col: gutter + px, color: '--main' });
      return out;
    });
    row = Math.max(row, c.icon.row + c.icon.h + 1);
    c.lines = [
      { text: title, row: py, col: gutter + px, color: '--main' },
      { text: GLASSES_LINK, row: py, col: gutter + px + title.length + 1, color: '--link' },
      { text: kind, row: py + 1, col: gutter + px, color: '--secondary' },
      { text: year, row: py + 2, col: gutter + px, color: '--secondary' },
      ...paragraphs,
    ];
    // The arrow: down from the title's row a cell after the text, then left along a row below it,
    // with a free row between so its head isn't covered by text.
    c.arrow = { col: px + Math.max(title.length, kind.length, year.length) + 2, top: py, row: py + 4, start: px };
    c.gw = Math.min(cols, c.arrow.col + px + 1);
    return row + py;
  },

  draw(c) {
    const { cols, rows, gutter, gh, gw, pw, lines } = c;
    const W = cols * 2, H = rows * 4, GH = gh * 4;
    const layer = () => new Uint8Array(W * H);
    const border = layer(), shade = layer(), dark = layer(), green = layer(), purple = layer();
    const [lit, gap] = GLASSES_SEGMENT, d = GLASSES_INSET;

    const line = (plot, ax, ay, bx, by) => {
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let i = 0; i <= n; i++) plot(Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n));
    };
    // A neon path: every `lit` dots followed by `gap` dark ones.
    // Each lit run is a segment that can flicker: its dots and the cells they are in.
    c.segs = [];
    const neon = buf => {
      let k = 0, seg = -1;
      return (x, y) => {
        const i = y * W + x, on = k++ % (lit + gap) < lit;
        (on ? buf : dark)[i] = 1;
        if (!on) { seg = -1; return; }
        if (seg < 0) { seg = c.segs.length; c.segs.push({ dots: [], cells: new Set(), until: 0, next: 0, off: false }); }
        c.segs[seg].dots.push(i);
        c.segs[seg].cells.add((y >> 2) * cols + (x >> 1));
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
      rounded(neon(tube), x0 + d, y0 + d, x1 - d, y1 - d, GLASSES_ROUND);
      rounded(neon(tube), x0 + d + 1, y0 + d + 1, x1 - d - 1, y1 - d - 1, GLASSES_ROUND - 1);
    };
    panel(0, 0, gw * 2 - 1, GH - 1, green);
    panel(0, GH, pw * 2 - 1, H - 1, purple);

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

    // The arrow, three dots thick: down beside the text, a bend, then left under the text to a
    // head pointing left.
    const { col: acol, top, row: arow, start } = c.arrow;
    const ax = acol * 2, ay = arow * 4 + 1, tip = start * 2;
    for (let t = -1; t <= 1; t++) {
      const plot = neon(green);
      line(plot, ax + t, top * 4, ax + t, ay - 3 + t);
      line(plot, ax + t - 1, ay - 2 + t, ax - 2 + t, ay - 1 + t);
      line(plot, ax - 3 + t, ay + t, tip + 3, ay + t);
    }
    for (let i = 0; i <= 4; i++) {
      for (let j = -i; j <= i; j++) green[(ay + j) * W + tip + i] = 1;
    }

    // Metal bars from the screen edge, ending in a wall plate: one thick bar for the green panel,
    // two for the purple one, near its top and bottom.
    if (gutter) {
      const bar = (r, rod) => { Cards.text(c, '⣿', 0, r, '--secondary'); Cards.text(c, rod.repeat(gutter - 1), 1, r, '--secondary'); };
      bar(Math.floor(gh / 2), '⣿');
      bar(gh + 2, '⠶');
      bar(rows - 3, '⠶');
    }

    // Text cells show only their letters.
    c.text = new Set();
    for (const l of lines) for (let i = 0; i < l.text.length; i++) c.text.add(l.row * cols + l.col - gutter + i);
    Object.assign(c, { W, layers: [[shade, '--faint'], [border, '--main'], [dark, '--main'], [green, '--neon'], [purple, '--neon-accent']] });
    c.offDots = new Uint8Array(W * H);
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) this.cell(c, col, r);
    for (const l of lines) Cards.text(c, l.text, l.col, l.row, l.color);
    c.cellLinks.push([lines[1].col, lines[1].row, 1, 'Photo of the AR glasses']);
    c.last = null;
  },

  // Draws one cell: each layer in its own pass, so a cell can hold dots of several colors. Neon dots
  // of a segment that is flickering off are drawn faint, as a dark tube.
  cell(c, col, r) {
    if (c.text.has(r * c.cols + col)) return;
    Cards.clear(c, c.gutter + col, r, 1, 1);
    for (const [buf, color] of c.layers) {
      const neon = color.startsWith('--neon');
      const ch = Cards.cell(buf, c.W, col, r, neon ? c.offDots : null);
      if (ch !== '\u2800') Cards.text(c, ch, c.gutter + col, r, color);
      if (!neon) continue;
      const unlit = this.unlit(c, buf, col, r);
      if (unlit !== '\u2800') Cards.text(c, unlit, c.gutter + col, r, '--faint');
    }
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

  // A fixed pseudo-random value 0..1 for a dot position.
  hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },

  // Flicker: now and then a segment starts flickering, going off and on at random for a moment.
  // Only cells of segments that change are redrawn.
  tick(c, t) {
    const dt = c.last === null ? 0 : Math.min(t - c.last, 0.1);
    c.last = t;
    const [rate, [d0, d1], share, [h0, h1]] = GLASSES_FLICKER;
    const dirty = new Set();
    for (const seg of c.segs) {
      if (t >= seg.until && Math.random() < rate * dt) seg.until = t + d0 + Math.random() * (d1 - d0);
      // During a flicker the segment holds each off or on state for a moment, so it's visible.
      if (t < seg.next) continue;
      const off = t < seg.until && Math.random() < share;
      seg.next = t + h0 + Math.random() * (h1 - h0);
      if (off === seg.off) continue;
      seg.off = off;
      for (const i of seg.dots) c.offDots[i] = off ? 1 : 0;
      for (const cell of seg.cells) dirty.add(cell);
    }
    for (const cell of dirty) this.cell(c, cell % c.cols, Math.floor(cell / c.cols));
  },
};
