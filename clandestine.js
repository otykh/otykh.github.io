// Clandestine card: a small slab of concrete. Straight edges with angled corners, and a scatter of
// aggregate specks through the face, fixed per position so they stay put across redraws. Pressed
// into the face, a faint golden statue of a figure raising both arms as wings, cut off by the card's bottom at its knees
// so its base never shows. Text: the title, a dim
// "personal project" line under it, and the description below.
const CLAN_COLS = 55;          // most columns wide: half the ESO card
const CLAN_PAD = [3, 2];       // cells between the edge and the text: columns, rows
const CLAN_SPECKS = 0.1;       // share of the face's dots that are aggregate specks
const CLAN_DARK = 0.3;         // share of specks in the darker gray
const CLAN_CORNER = 8;         // dots cut off each corner, at 45°
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
    // The fields after the title and kind are the description, each a paragraph with a blank line
    // before the next.
    const [kind, title, ...description] = c.fields.map(f => f[1]);
    let row = py + 3;
    const paragraphs = description.flatMap((d, k) => {
      if (k) row++;
      return Cards.wrap(d, c.tw).map(text => ({ text, row: row++, color: '--main' }));
    });
    c.lines = [
      { text: title, row: py, color: '--main' },
      { text: kind, row: py + 1, color: '--secondary' },
      ...paragraphs,
    ];
    return c.lines.at(-1).row + 1 + py;
  },

  draw(c) {
    const { cols, rows, tc, lines } = c;
    const W = cols * 2, H = rows * 4, dots = new Uint8Array(W * H), dark = new Uint8Array(W * H);
    const gold = new Uint8Array(W * H);

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

    // The statue near the right edge, taller than the face so the card's bottom cuts it off, dotted
    // so it reads as an imprint; it replaces the specks inside it, the edge stays on top.
    const sh = Math.round((H - 4) * CLAN_STATUE[2]), sx = W - CLAN_STATUE[1] * 2 - Math.ceil(sh * 0.4);
    for (let y = 4; y < H - 2; y++) {
      for (let x = Math.max(2, Math.floor(sx - sh / 2)); x < Math.min(W - 2, sx + sh / 2); x++) {
        const i = y * W + x;
        if (!this.inStatue((x - sx) / sh, (y - 4) / sh)) continue;
        if (Math.min(x, W - 1 - x) + Math.min(y, H - 1 - y) < k + 2) continue;
        dots[i] = gold[i] = this.hash(x + 911, y) < CLAN_STATUE[0] ? 1 : 0;
        dark[i] = 0;
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
        let darker = false, golden = 0;
        for (let k = 0; k < 8; k++) {
          const i = (r * 4 + (k >> 1)) * W + col * 2 + (k & 1);
          darker ||= dark[i] === 1;
          golden += gold[i];
        }
        Cards.text(c, ch, col, r, darker ? '--secondary' : golden ? '--statue' : '--faint');
      }
    }
    for (const l of lines) Cards.text(c, l.text, tc, l.row, l.color);
  },

  tick() {},
};
