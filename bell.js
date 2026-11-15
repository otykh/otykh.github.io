// Lonely Bell Sound card (game jam entry): the outline of a medieval town's skyline in braille dots,
// with the card's text in the town. At the left a building close to the viewer rises past the top of
// the card, its roof edge stepping down to the right; behind it stands the church, a nave with a
// steep roof and a bell tower with a bulb dome and a spire. Houses carry on to the right as far as
// the card is wide, so narrow screens show the near building and the church. Roofs are kept to
// straight lines and 45° slopes, which braille draws cleanly. The near building and the church, the
// two buildings every screen shows, are the card: walls run down its sides to a square bottom edge,
// and the text sits in the open space under the roofs, the title followed by a link icon. The right wall stands at the screen's edge on
// narrow screens and stops at BELL_CARD on wide ones; the rest of the town carries on past it as
// decoration, standing on the bottom edge, with a last wall where it ends at the card's right side.
//
// Behind the town the sun peeks out over the roofs: a shimmering golden rim fading to clear in its
// middle, sending pale heat waves up and out across the page (on their own canvas, behind the cards
// and hidden under them, reaching just past the card above). Above the roofs the sky spreads out
// from the sun in rings, from a nearly white blue near it to light blue to dark blue. The sun is a button: it switches the whole site to night, where it becomes the
// moon, the sky darkens, stars come out and the heat waves stop.
const BELL_ROWS = 11;          // card height in cells (44 dots: the outline's units are dots)
const BELL_LINK = '\u21AA\uFE0E'; // hooked arrow after the title, linking to the game
const BELL_SEED = 7;           // which run of houses (the same seed gives the same town)
const BELL_CARD = 36;          // most columns the card is wide (its right wall), past the church
const BELL_SUN = { x: 26, y: 19, r: 11 }; // the sun's middle and radius, in dots (behind the nave, between
                               // the near building and the bell tower)
const BELL_SHIMMER = 12;       // times a second the sun's rim is redrawn
const BELL_RAYS = { rings: 7, travel: 13, wave: 1.2, fps: 15, reachPhone: 20, beyond: 5, run: 1.3 }; // heat
                               // waves: rings at once, seconds a ring takes to spread out, how far they
                               // wave (dots), frames a second, rows they reach up on narrow screens, rows
                               // past the card above, how far a ring goes × the distance to the top
const BELL_SKY = [0.15, 0.4];  // share of the sky's dots lit nearest the sun and farthest from it
const BELL_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(b => (b + 0.5) / 16); // even dithering
const BELL_STARS = 0.02;       // share of the night sky's dots that are stars

CARD_DESIGNS.bell = {
  layout(c) {
    const field = name => c.fields.find(f => f[0] === name)?.[1] ?? '';
    const head = [[field('Title'), '--main'], [field('Kind'), '--secondary'], [field('Year'), '--secondary']];
    // The text starts just under the roofs: the title, kind and year a blank row below the lowest roof over
    // them, and the description, a blank row further down, a blank row below the lowest roof over it.
    const card = Math.min(BELL_CARD, c.cols), tw = card - 4, col = 2, outline = this.outline(card * 2);
    const below = w => {
      let low = 0;
      for (const [x, y] of outline) if (x >= col * 2 && x <= (col + w) * 2) low = Math.max(low, y);
      return Math.floor(low / 4) + 2;
    };
    const body = Cards.wrap(field('Description'), tw);
    const headW = Math.max(head[0][0].length + 2, ...head.slice(1).map(([text]) => text.length)), bodyW = Math.max(...body.map(l => l.length));
    const row0 = Math.max(below(headW), below(bodyW) - head.length - 1);
    c.lines = [
      ...head.map(([text, color], i) => ({ text, color, col, row: row0 + i })),
      { text: BELL_LINK, color: '--link', col: col + head[0][0].length + 1, row: row0 },
      ...body.map((text, i) => ({ text, color: '--main', col, row: row0 + head.length + 1 + i })),
    ];
    return c.lines.at(-1).row + 2;
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

  // A fixed pseudo-random value 0..1 for a dot position.
  hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },

  draw(c) {
    const { cols, rows } = c, W = cols * 2, H = rows * 4, dots = new Uint8Array(W * H);
    const plot = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) dots[y * W + x] = 1; };
    // The card's right wall, and how far down the skyline is there (where the wall starts).
    const R = Math.min(BELL_CARD, cols) * 2 - 1, B = H - 1;
    const E = W - 1;           // the far right, where the town ends
    let wallTop = B, endTop = B;
    const top = new Int16Array(W).fill(B);   // the skyline's highest dot in each column
    const pts = this.outline(W).map(([x, y]) => [Math.round(x), Math.round(y)]);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n);
        plot(x, y);
        if (x >= 0 && x < W) top[x] = Math.min(top[x], y);
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

    Object.assign(c, { W, H, R, town: dots, top, night: Theme.dark });
    this.sky(c);
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) this.cell(c, col, r);
    this.sun(c, 0);
    // The text; the word "sun" in the description is drawn in the sun's color, and switches day
    // and night like the sun (see button()).
    c.sunWord = null;
    for (const l of c.lines) {
      const at = l.color === '--main' ? l.text.search(/\bsun\b/) : -1;
      if (at < 0) { Cards.text(c, l.text, l.col, l.row, l.color); continue; }
      Cards.text(c, l.text.slice(0, at), l.col, l.row, l.color);
      Cards.text(c, 'sun', l.col + at, l.row, '--sun');
      c.sunWord = [l.col + at, l.row];
      Cards.text(c, l.text.slice(at + 3), l.col + at + 3, l.row, l.color);
    }
    const icon = c.lines.find(l => l.text === BELL_LINK);
    c.cellLinks.push([icon.col, icon.row, 1, `${c.lines[0].text} on itch.io`]);
    this.button(c);
    this.rays(c);
  },

  // The sky (and the stars at night): dots above the roofs in rings around the sun, pale and few near it, more and darker farther out; fixed per position so they
  // stay put. Kept per cell, by color.
  sky(c) {
    const { W, top, night } = c, cols = W / 2, { x: sx, y: sy, r } = BELL_SUN;
    c.skyCells = new Map();
    // Six shades from nearly white blue through light blue to dark blue.
    const pale = c.color('--sky-pale'), light = c.color('--sky-light'), dark = c.color('--sky-dark');
    const shades = [0, 1, 2, 3, 4, 5].map(k => k < 3 ? Cards.mix(pale, light, k / 3) : Cards.mix(light, dark, (k - 3) / 2));
    // The sky starts just outside the sun's halo and ends at the far top corner.
    const d0 = r * 1.3, d1 = Math.hypot(W - sx, sy);
    const add = (x, y, color) => {
      const k = (y >> 2) * cols + (x >> 1);
      if (!c.skyCells.has(k)) c.skyCells.set(k, new Map());
      const byColor = c.skyCells.get(k);
      byColor.set(color, (byColor.get(color) || 0) | DOT_BIT[y & 3][x & 1]);
    };
    for (let x = 1; x < W - 1; x++) {
      for (let y = 1; y < top[x] - 1; y++) {
        const v = this.hash(x, y);
        if (night && v < BELL_STARS * (1 - y / top[x])) { if (!this.inSun(c, x, y, 1.3)) add(x, y, c.color('--star')); continue; }
        // u: 0 nearest the sun, 1 farthest. The sky fades in around the sun and thins out right
        // above the roofs. Ordered dithering keeps the gradient even, not grainy. Each dot's shade
        // is picked with a little noise, so neighbouring shades blend into each other.
        const d = Math.hypot(x - sx, y - sy), u = Math.min(1, (d - d0) / (d1 - d0));
        const fade = Math.min(1, (d - d0) / 12, (top[x] - 1 - y) / 4);
        if (BELL_BAYER[(y & 3) * 4 + (x & 3)] < (BELL_SKY[0] + (BELL_SKY[1] - BELL_SKY[0]) * u) * fade) add(x, y, shades[Math.max(0, Math.min(5, Math.floor(u * 6 + this.hash(x + 5, y + 9) - 0.5)))]);
      }
    }
  },

  // Whether dot (x, y) is within `k` radii of the sun's middle.
  inSun(c, x, y, k) {
    const { x: sx, y: sy, r } = BELL_SUN;
    return Math.hypot(x - sx, y - sy) < r * k;
  },

  // Draws one cell of the card's town and sky (the sun goes over these, the text over everything).
  cell(c, col, r) {
    const town = Cards.cell(c.town, c.W, col, r);
    if (town !== '\u2800') Cards.text(c, town, col, r, '--secondary');
    const sky = c.skyCells.get(r * (c.W / 2) + col);
    if (sky) for (const [color, bits] of sky) Cards.text(c, String.fromCharCode(0x2800 + bits), col, r, color);
  },

  // The sun (or the moon at night) behind the town: only the part above the roofs shows. The sun's
  // rim is golden and shimmers, its inside fades to clear toward the middle, and a thin halo flickers
  // just outside it. The moon is a still, pale crescent.
  sun(c, t) {
    const { W, R, top, night } = c, { x: sx, y: sy, r } = BELL_SUN, cols = W / 2;
    const reach = Math.ceil(r * 1.4), c0 = Math.max(0, (sx - reach) >> 1), c1 = Math.min(cols - 1, (sx + reach) >> 1);
    // Rows down to the lowest roof over these columns: below that is the town (and the text).
    let roof = 0;
    for (let x = c0 * 2; x < c1 * 2 + 2; x++) roof = Math.max(roof, top[x]);
    const r0 = Math.max(0, (sy - reach) >> 2), r1 = Math.min(c.rows - 1, (sy + reach) >> 2, (roof - 2) >> 2);
    c.sunBottom = Math.min(sy + r, roof - 1);
    const sun = c.color('--sun'), shades = [sun, Cards.mix(sun, c.color('--bg'), 0.35), Cards.mix(sun, c.color('--bg'), 0.6)];
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const bits = [0, 0, 0];
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const x = col * 2 + dx, y = row * 4 + dy;
            if (x <= 0 || x >= R || y >= top[x] - 1) continue;
            const d = Math.hypot(x - sx, y - sy) / r, a = Math.atan2(y - sy, x - sx), v = this.hash(x + 3, y + 7);
            let shade = -1;
            if (night) {
              const bite = Math.hypot(x - sx - r * 0.45, y - sy + r * 0.25) / r;
              if (d < 1 && bite > 0.85 && v < 0.85) shade = 0;
            } else {
              const edge = 1 + 0.04 * Math.sin(a * 7 + t * 3), band = 2.5 / r;
              const flicker = 0.15 * Math.sin(t * (2 + v * 5) + v * 40);
              if (d < edge && d > edge - band) {
                // The rim: a solid golden ring.
                if (v < 0.92 + flicker * 0.5) shade = 0;
              } else if (d < edge) {
                // Inside: clear in the middle, filling in toward the rim.
                const fill = Math.max(0, (d - 0.4) / (edge - band - 0.4)) ** 1.6 * 0.7;
                if (v < fill + flicker * 0.4) shade = 1;
              } else if (d < edge + 0.3) {
                // The halo: thinning out away from the rim, flickering.
                if (v < (1 - (d - edge) / 0.3) * 0.35 + flicker) shade = 2;
              }
            }
            if (shade >= 0) bits[shade] |= DOT_BIT[dy][dx];
          }
        }
        if (t) { Cards.clear(c, col, row, 1, 1); this.cell(c, col, row); }
        bits.forEach((b, k) => { if (b) Cards.text(c, String.fromCharCode(0x2800 + b), col, row, shades[k]); });
      }
    }
  },

  // A real button over the sun, for switching between day and night (mouse, touch or keyboard).
  // Another over the word "sun" in the description, doing the same.
  button(c) {
    if (!c.sunButton) {
      [c.sunButton, c.sunWordButton] = [0, 1].map(() => {
        const b = document.createElement('button');
        b.className = 'sun-switch';
        b.addEventListener('click', () => Theme.set(!Theme.dark));
        c.canvas.parentElement.append(b);
        return b;
      });
    }
    for (const b of [c.sunButton, c.sunWordButton]) {
      b.setAttribute('aria-label', Theme.dark ? 'Switch to day (light theme)' : 'Switch to night (dark theme)');
    }
    // The sun's covers the whole visible sun, its clear middle included, down to the roofs.
    const { x: sx, y: sy, r } = BELL_SUN, y0 = Math.max(0, sy - r);
    Object.assign(c.sunButton.style, {
      left: `${(sx - r) / 2 * c.cellW}px`, top: `${y0 / 4 * c.cellH}px`,
      width: `${r * c.cellW}px`, height: `${(c.sunBottom - y0) / 4 * c.cellH}px`,
    });
    // The word's covers its three cells.
    c.sunWordButton.hidden = !c.sunWord;
    if (c.sunWord) {
      const [col, row] = c.sunWord;
      Object.assign(c.sunWordButton.style, { left: `${col * c.cellW}px`, top: `${row * c.cellH}px`, width: `${3 * c.cellW}px`, height: `${c.cellH}px` });
    }
  },

  // The heat waves' canvas: behind the cards, from the screen's left edge to its right, from a little
  // past the top of the card above down to this card's bottom. Laid on this card's grid.
  rays(c) {
    if (!c.rayCanvas) {
      c.rayCanvas = document.createElement('canvas');
      c.rayCanvas.className = 'sun-rays';
      c.rayCanvas.setAttribute('aria-hidden', 'true');
      c.rayCtx = c.rayCanvas.getContext('2d');
      c.canvas.parentElement.prepend(c.rayCanvas);
      new IntersectionObserver(([e]) => { c.extraVisible = e.isIntersecting; }).observe(c.rayCanvas);
    }
    const sheet = c.canvas.getBoundingClientRect(), above = c.el.previousElementSibling?.querySelector('canvas');
    const up = above ? Math.max(0, sheet.top - above.getBoundingClientRect().top) : 0;
    const reach = Math.min(Math.ceil(up / c.cellH) + BELL_RAYS.beyond, c.stacked ? BELL_RAYS.reachPhone : Infinity);
    const left = Math.floor(sheet.left / c.cellW), cols = left + Math.floor((document.documentElement.clientWidth - sheet.left) / c.cellW);
    const rows = reach + c.rows;
    const n = cols * 2 * rows * 4;
    // The other cards' cells on this grid (every cell they touch), where the waves are hidden: the
    // cards are transparent, and the waves go behind them, not through them.
    const ox = sheet.left - left * c.cellW, oy = sheet.top - reach * c.cellH;
    const hidden = Cards.cards.filter(o => o !== c).map(o => {
      const b = o.canvas.getBoundingClientRect();
      return [Math.floor((b.left - ox) / c.cellW), Math.floor((b.top - oy) / c.cellH), Math.ceil((b.right - ox) / c.cellW), Math.ceil((b.bottom - oy) / c.cellH)];
    });
    Object.assign(c, { rayLeft: left, rayUp: reach, rayCols: cols, rayRows: rows, rayHidden: hidden, rayLast: -1 });
    c.rayDots = [0, 1, 2].map(() => new Uint8Array(n));
    c.rayCanvas.width = Math.round(cols * c.cellW * c.dpr);
    c.rayCanvas.height = Math.round(rows * c.cellH * c.dpr);
    Object.assign(c.rayCanvas.style, {
      left: `${-left * c.cellW}px`, top: `${-reach * c.cellH}px`,
      width: `${cols * c.cellW}px`, height: `${rows * c.cellH}px`,
    });
    const g = c.rayCtx;
    g.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    g.clearRect(0, 0, cols * c.cellW, rows * c.cellH);
    g.font = `${FONT_SIZE}px ${c.font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    c.rayShades = [0, 0.35, 0.65].map(k => Cards.mix(c.color('--sun-ray'), c.color('--bg'), k));
  },

  // One frame of heat waves: rings spreading out from the sun all around, each a dotted line with small
  // waves along it, holding up most of the way and then thinning and paling out. Not over the town,
  // the sun itself or the other cards.
  drawRays(c, t) {
    const { rayCols: cols, rayRows: rows, rayDots: layers, rayCtx: g, top, W, H } = c, RW = cols * 2, RH = rows * 4;
    const ox = c.rayLeft * 2, oy = c.rayUp * 4, sx = ox + BELL_SUN.x, sy = oy + BELL_SUN.y, r0 = BELL_SUN.r * 1.4;
    const { rings, travel, wave, run: far } = BELL_RAYS, maxR = Math.max(sy, Math.min(sx, RW - sx)) * far;
    for (const l of layers) l.fill(0);
    for (let k = 0; k < rings; k++) {
      // pos: how far out this ring is (0 at the sun, 1 at the end); id changes each time it restarts.
      const run = k / rings + t / travel, pos = run % 1, id = Math.floor(run) * rings + k;
      const rad = r0 + pos * (maxR - r0), density = 0.75 * (1 - pos ** 2.5) * Math.min(1, pos * 8);
      const step = 1 / rad;
      for (let a = -Math.PI, i = 0; a < Math.PI; a += step, i++) {
        if (this.hash(id, i) >= density) continue;
        const rr = rad + wave * Math.sin(a * rad / 5 + t * 1.5 + k);
        const x = Math.round(sx + Math.cos(a) * rr), y = Math.round(sy + Math.sin(a) * rr);
        if (x < 0 || y < 0 || x >= RW || y >= RH) continue;
        const bx = x - ox, by = y - oy;
        if (bx >= 0 && by >= 0 && bx < W && by < H && by >= top[bx] - 1) continue;
        layers[pos < 0.4 ? 0 : pos < 0.7 ? 1 : 2][y * RW + x] = 1;
      }
    }
    g.clearRect(0, 0, cols * c.cellW, rows * c.cellH);
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if (c.rayHidden.some(([c0, r0, c1, r1]) => col >= c0 && col < c1 && r >= r0 && r < r1)) continue;
        layers.forEach((l, k) => {
          const ch = Cards.cell(l, RW, col, r);
          if (ch !== '\u2800') { g.fillStyle = c.rayShades[k]; g.fillText(ch, (col + 0.5) * c.cellW, (r + 0.5) * c.cellH); }
        });
      }
    }
  },

  // By day: the sun's rim shimmers and the heat waves move. At night nothing moves.
  tick(c, t) {
    if (c.night) return;
    if (t - (c.sunLast ?? -1) >= 1 / BELL_SHIMMER) { c.sunLast = t; this.sun(c, t); }
    if (t - c.rayLast >= 1 / BELL_RAYS.fps) { c.rayLast = t; this.drawRays(c, t); }
  },
};
