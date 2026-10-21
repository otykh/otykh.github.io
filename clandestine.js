// Clandestine card: a small slab of concrete. Straight edges with angled corners, and a scatter of
// aggregate specks through the face, fixed per position so they stay put across redraws. Text: the
// title, a dim "personal project" line under it, and the description below.
const CLAN_COLS = 55;          // most columns wide: half the ESO card
const CLAN_PAD = [3, 2];       // cells between the edge and the text: columns, rows
const CLAN_SPECKS = 0.1;       // share of the face's dots that are aggregate specks
const CLAN_DARK = 0.3;         // share of specks in the darker gray
const CLAN_CORNER = 8;         // dots cut off each corner, at 45°

CARD_DESIGNS.clandestine = {
  max: CLAN_COLS,
  right: true,

  // A fixed pseudo-random value 0..1 for a dot position.
  hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },

  layout(c) {
    const [px, py] = CLAN_PAD;
    const [kind, title, description] = c.fields.map(f => f[1]);
    c.tc = px;
    c.tw = c.cols - 2 * px;
    c.lines = [
      { text: title, row: py, color: '--main' },
      { text: kind, row: py + 1, color: '--secondary' },
      ...Cards.wrap(description, c.tw).map((text, i) => ({ text, row: py + 3 + i, color: '--main' })),
    ];
    return c.lines.at(-1).row + 1 + py;
  },

  draw(c) {
    const { cols, rows, tc, lines } = c;
    const W = cols * 2, H = rows * 4, dots = new Uint8Array(W * H), dark = new Uint8Array(W * H);

    // Edge, in the darker gray: straight sides along the outer dots, joined by 45° cuts at the corners.
    const k = CLAN_CORNER, set = (x, y) => { dots[y * W + x] = dark[y * W + x] = 1; };
    for (let x = k; x < W - k; x++) { set(x, 0); set(x, H - 1); }
    for (let y = k; y < H - k; y++) { set(0, y); set(W - 1, y); }
    for (let i = 0; i <= k; i++) {
      set(k - i, i); set(W - 1 - k + i, i);
      set(k - i, H - 1 - i); set(W - 1 - k + i, H - 1 - i);
    }

    // Aggregate: specks through the face (clear of the edge and its cut corners), a share darker.
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (Math.min(x, W - 1 - x) + Math.min(y, H - 1 - y) < k + 2) continue;
        const v = this.hash(x, y);
        if (v < CLAN_SPECKS) { dots[y * W + x] = 1; dark[y * W + x] = v < CLAN_SPECKS * CLAN_DARK ? 1 : 0; }
      }
    }

    // Text cells stay clear of specks, with a cell of space after each line.
    const text = new Set();
    for (const l of lines) for (let i = -1; i <= l.text.length; i++) text.add(l.row * cols + tc + i);

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if (text.has(r * cols + col)) continue;
        const ch = Cards.cell(dots, W, col, r);
        if (ch === '⠀') continue;
        let darker = false;
        for (let k = 0; k < 8; k++) darker ||= dark[(r * 4 + (k >> 1)) * W + col * 2 + (k & 1)] === 1;
        Cards.text(c, ch, col, r, darker ? '--secondary' : '--faint');
      }
    }
    for (const l of lines) Cards.text(c, l.text, tc, l.row, l.color);
  },

  tick() {},
};
