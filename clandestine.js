// Clandestine card: a box of brick wall. Bricks are one character tall and CLAN_BRICK cells long,
// laid in running bond (each row shifted half a brick, with half bricks closing the ends), drawn as
// faint mortar lines inside a darker border around the box. Text sits on the bricks. A faint golden
// statue of a figure raising both arms as wings is set into the wall: the bricks stop around it, and
// the card's bottom cuts it off at the knees so its base never shows. Text: the title with a link
// icon after it, a dim "personal project" line under it, and the description below.
const CLAN_COLS = 55;          // most columns wide: half the ESO card
const CLAN_PAD = [3, 2];       // cells between the edge and the text: columns, rows
const CLAN_BRICK = 4;          // cells a brick is long
const CLAN_LINK = '\u21AA\uFE0E'; // hooked arrow (↪, text style so it takes the link color) after the title, linking to the project
const CLAN_STATUE = [0.85, 2, 1.2]; // statue: share of its dots drawn, columns from the right edge, height × the face's (sets where it is cut off)

CARD_DESIGNS.clandestine = {
  max: CLAN_COLS,
  right: true,

  // Whether a point is inside the statue: a figure raising both arms in a V, each arm a wing. Units
  // are the statue's height, x from its middle, y down from the tips of its wings.
  inStatue(x, y) {
    const ax = Math.abs(x);
    // Whether the point is within r of a segment; mirrored, so shapes given for x ≥ 0 appear on both sides.
    const seg = (x0, y0, x1, y1, r) => {
      const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((ax - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(ax - x0 - dx * t, y - y0 - dy * t) < r;
    };
    return Math.hypot(x, y - 0.2) < 0.065                        // head
      || seg(0, 0.27, 0, 0.29, 0.03)                             // neck
      || y > 0.29 && y < 0.58 && ax < 0.11 - (y - 0.29) * 0.12   // torso, narrowing to the waist
      || this.inWing(ax, y, seg)                                 // wings, mirrored
      || y >= 0.56 && y < 0.65 && ax < 0.085                     // hips
      || seg(0.04, 0.62, 0.05, 1, 0.035) || seg(-0.04, 0.62, -0.05, 1, 0.035); // legs
  },

  // One arm-wing (x ≥ 0): the arm raised up and out from the shoulder, with feathers hanging from
  // it down and outward, longest at the body and shortening toward the hand, so the wing is thickest
  // near the body; its trailing edge is scalloped.
  inWing(x, y, seg) {
    const sx = 0.08, sy = 0.32, hx = 0.24, hy = 0.03;
    if (seg(sx, sy, hx, hy, 0.035)) return true;
    let nx = sy - hy, ny = hx - sx;
    const nl = Math.hypot(nx, ny);
    nx /= nl; ny /= nl;
    for (let j = 0; j < 6; j++) {
      const t = j / 6, px = sx + (hx - sx) * t, py = sy + (hy - sy) * t, len = 0.2 - 0.17 * t;
      if (seg(px, py, px + nx * len, py + ny * len + 0.06 * (1 - t), 0.032)) return true;
    }
    return false;
  },

  // A fixed pseudo-random value 0..1 for a dot position.
  hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },

  layout(c) {
    const [px, py] = CLAN_PAD;
    c.tc = px;
    c.tw = c.cols - 2 * px;
    // The fields after the kind, title and year are the description, each a paragraph with a blank
    // line before the next.
    const [kind, title, year, ...description] = c.fields.map(f => f[1]);
    let row = py + 4;
    const paragraphs = description.flatMap((d, k) => {
      if (k) row++;
      return Cards.wrap(d, c.tw).map(text => ({ text, row: row++, color: '--main' }));
    });
    c.lines = [
      { text: title, row: py, color: '--main' },
      { text: CLAN_LINK, row: py, col: px + title.length + 1, color: '--link' },
      { text: kind, row: py + 1, color: '--secondary' },
      { text: year, row: py + 2, color: '--secondary' },
      ...paragraphs,
    ];
    return c.lines.at(-1).row + 1 + py;
  },

  draw(c) {
    const { cols, rows, tc, lines } = c;
    const W = cols * 2, H = rows * 4, dots = new Uint8Array(W * H), edge = new Uint8Array(W * H);
    const gold = new Uint8Array(W * H), statue = new Set();

    // The statue near the right edge, taller than the face so the card's bottom cuts it off, dotted
    // so it reads as an imprint. Cells it touches are left out of the wall.
    const sh = Math.round((H - 4) * CLAN_STATUE[2]), sx = W - CLAN_STATUE[1] * 2 - Math.ceil(sh * 0.4);
    for (let y = 4; y < H - 2; y++) {
      for (let x = Math.max(2, Math.floor(sx - sh / 2)); x < Math.min(W - 2, sx + sh / 2); x++) {
        const i = y * W + x;
        if (!this.inStatue((x - sx) / sh, (y - 4) / sh)) continue;
        dots[i] = gold[i] = this.hash(x + 911, y) < CLAN_STATUE[0] ? 1 : 0;
        statue.add((y >> 2) * cols + (x >> 1));
      }
    }

    // Bricks: per row of cells, mortar along the bottom and a joint at each brick's ends; odd rows
    // are shifted half a brick, so they start and end with half bricks. Cells the statue touches
    // are left out.
    const bw = CLAN_BRICK * 2, shift = CLAN_BRICK;
    for (let r = 0; r < rows; r++) {
      for (let x = 0; x < W; x++) {
        if (statue.has(r * cols + (x >> 1))) continue;
        const joint = (x + (r & 1) * shift) % bw === 0;
        for (let dy = 0; dy < 4; dy++) if (dy === 3 || joint) dots[(r * 4 + dy) * W + x] = 1;
      }
    }

    // The box's border, darker, along its outer dots.
    const set = (x, y) => { dots[y * W + x] = edge[y * W + x] = 1; };
    for (let x = 0; x < W; x++) { set(x, 0); set(x, H - 1); }
    for (let y = 0; y < H; y++) { set(0, y); set(W - 1, y); }

    // Text cells show their letter instead of a brick.
    const text = new Set();
    for (const l of lines) for (let i = 0; i < l.text.length; i++) text.add(l.row * cols + (l.col ?? tc) + i);

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if (text.has(r * cols + col)) continue;
        // A border cell is drawn twice in the same place: its bricks in their color, then the
        // border's dots on top in the darker one, so the bricks along the edge keep their color.
        let golden = 0;
        for (let k = 0; k < 8; k++) golden += gold[(r * 4 + (k >> 1)) * W + col * 2 + (k & 1)];
        const inner = Cards.cell(dots, W, col, r, edge), border = Cards.cell(edge, W, col, r);
        if (inner !== '\u2800') Cards.text(c, inner, col, r, golden ? '--statue' : '--faint');
        if (border !== '\u2800') Cards.text(c, border, col, r, '--secondary');
      }
    }
    for (const l of lines) Cards.text(c, l.text, l.col ?? tc, l.row, l.color);
    const icon = lines[1];
    c.cellLinks.push([icon.col, icon.row, 1, `${lines[0].text} on itch.io`]);
  },

  tick() {},
};
