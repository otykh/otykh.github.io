// Lonely Bell Sound card (game jam entry): the outline of a medieval town's skyline in braille dots,
// with the card's text in the town. At the left a building close to the viewer rises past the top of the card, its roof
// edge stepping down to the right; behind it stands the church, a nave with a steep roof and a bell
// tower with a bulb dome and a spire. Houses carry on to the right as far as the card is wide, so
// narrow screens show the near building and the church. Roofs are kept to straight lines and 45°
// slopes, which braille draws cleanly. The near building and the church, the two buildings every
// screen shows, are the card: walls run down its sides to a square bottom edge, and the text sits in
// the open space under the roofs. The right wall stands at the screen's edge on narrow screens and
// stops at BELL_CARD on wide ones; the rest of the town carries on past it as decoration, standing
// on the bottom edge, with a last wall where it ends at the card's right side.
const BELL_ROWS = 11;          // card height in cells (44 dots: the outline's units are dots)
const BELL_SEED = 7;           // which run of houses (the same seed gives the same town)
const BELL_CARD = 36;          // most columns the card is wide (its right wall), past the church

CARD_DESIGNS.bell = {
  layout(c) {
    const field = name => c.fields.find(f => f[0] === name)?.[1] ?? '';
    const head = [[field('Title'), '--main'], [field('Kind'), '--secondary']];
    // The text starts a blank row below the lowest roof above it.
    const card = Math.min(BELL_CARD, c.cols), tw = card - 4, col = 2;
    let low = 0;
    for (const [x, y] of this.outline(card * 2)) if (x >= col * 2 && x <= (col + tw) * 2) low = Math.max(low, y);
    const row0 = Math.floor(low / 4) + 2;
    const body = Cards.wrap(field('Description'), tw);
    c.lines = [
      ...head.map(([text, color], i) => ({ text, color, col, row: row0 + i })),
      ...body.map((text, i) => ({ text, color: '--main', col, row: row0 + head.length + 1 + i })),
    ];
    return c.lines.at(-1).row + 3;
  },

  // The skyline's outline as points along its top, left to right, in dots, y down from the top; the
  // lowest roofs sit at the card's bottom edge.
  outline(W) {
    const p = [];
    // A point straight above or below the last one, when the one before that is too, replaces it:
    // the outline then never runs down a wall and back up it (a line into the buildings).
    const to = (x, y) => {
      const n = p.length;
      if (n >= 2 && p[n - 1][0] === x && p[n - 2][0] === x) p[n - 1] = [x, y];
      else p.push([x, y]);
    };

    // The near building: straight down from the top, then its roof edge steps down to the right.
    to(0, 0); to(11, 0); to(11, 12); to(23, 24);
    // The church: the nave's roof seen from the side, its ridge running behind the bell tower, which
    // has a bulb dome, a lantern and a spire.
    to(23, 29); to(27, 25); to(38, 25);
    to(38, 20); to(37, 18); to(37, 16); to(38, 14); to(40, 12); to(42, 11); to(43, 10);
    to(43, 7); to(44, 7); to(44, 1); to(45, 1); to(45, 7); to(46, 7);
    to(46, 10); to(47, 11); to(49, 12); to(51, 14); to(52, 16); to(52, 18); to(51, 20);
    to(51, 25); to(55, 25); to(63, 33); to(63, 38);

    // The town: gabled houses at 45°, now and then with a chimney, a stepped gable or a tower.
    let s = BELL_SEED, x = 63;
    const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
    while (x < W) {
      const kind = rnd(), eave = 34 + Math.floor(rnd() * 8), w = 8 + 2 * Math.floor(rnd() * 5);
      to(x, eave);
      if (kind < 0.12) {
        // A tower: tall walls and a pointed roof.
        to(x, 22); to(x + 4, 14); to(x + 8, 22); to(x + 8, eave);
        x += 8;
      } else if (kind < 0.3) {
        // A stepped gable.
        let y = eave, cx = x;
        for (; cx + 2 < x + w / 2; cx += 2) { to(cx, y - 2); to(cx + 2, y - 2); y -= 2; }
        for (cx = x + w - (cx - x); cx < x + w; cx += 2) { to(cx, y); to(cx, y + 2); y += 2; }
        x += w;
      } else {
        const peak = eave - w / 2;
        if (rnd() < 0.4) { const cx = x + 2 + Math.floor(rnd() * (w / 2 - 3)), cy = eave - (cx - x); to(cx, cy); to(cx, cy - 6); to(cx + 2, cy - 6); to(cx + 2, cy - 2); }
        to(x + w / 2, peak); to(x + w, eave);
        x += w;
      }
    }
    return p;
  },

  draw(c) {
    const { cols, rows } = c, W = cols * 2, H = rows * 4, dots = new Uint8Array(W * H);
    const plot = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) dots[y * W + x] = 1; };
    // The card's right wall, and how far down the skyline is there (where the wall starts).
    const R = Math.min(BELL_CARD, cols) * 2 - 1, B = H - 1;
    const E = W - 1;           // the far right, where the town ends
    let wallTop = B, endTop = B;
    const pts = this.outline(W).map(([x, y]) => [Math.round(x), Math.round(y)]);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n);
        plot(x, y);
        if (x === R) wallTop = Math.min(wallTop, y);
        if (x === E) endTop = Math.min(endTop, y);
      }
    }

    // The card: a wall down each side (from the skyline, not across the tops) to a square bottom
    // edge, which runs on under the rest of the town.
    for (let y = 0; y <= B; y++) plot(0, y);
    // Where the decorative town carries on past it, the card's right wall is dotted: every fourth dot.
    for (let y = wallTop; y <= B; y++) if (R === E || (B - y) % 4 === 0) plot(R, y);
    for (let y = endTop; y <= B; y++) plot(E, y);
    for (let x = 0; x < W; x++) plot(x, B);

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const ch = Cards.cell(dots, W, col, r);
        if (ch !== '\u2800') Cards.text(c, ch, col, r, '--secondary');
      }
    }
    for (const l of c.lines) Cards.text(c, l.text, l.col, l.row, l.color);
  },

  tick() {},
};
