// Clandestine card: a box of brick wall. Bricks are one character tall and CLAN_BRICK cells long,
// laid in running bond (each row shifted half a brick, with half bricks closing the ends), drawn as
// faint mortar lines inside a darker border around the box. Text sits on the bricks. A faint golden
// statue of a figure raising both arms as wings is set into the wall: the bricks stop around it, and
// the card's bottom cuts it off at the knees so its base never shows. Text: the title with a link
// icon after it, a dim "personal project" line under it, and the description below.
//
// Left of it, on wide screens only (on a canvas of its own, on the same grid): the wall goes on,
// broken through. The hole's edge steps down brick by brick from the top right to the bottom, with
// a bit of wall left at the bottom left, the wall's border going on along its edges. Through the
// hole: a pale blue sky, two round green hills, and a tree on the nearer one, its autumn leaves (red and yellow) stirring,
// now and then one blowing off.
const CLAN_COLS = 55;          // most columns wide: half the ESO card
const CLAN_PAD = [3, 2];       // cells between the edge and the text: columns, rows
const CLAN_BRICK = 4;          // cells a brick is long
const CLAN_LINK = '\u21AA\uFE0E'; // hooked arrow (↪, text style so it takes the link color) after the title, linking to the project
const CLAN_STATUE = [0.85, 2, 1.2]; // statue: share of its dots drawn, columns from the right edge, height × the face's (sets where it is cut off)
// The broken wall left of the card (with one brick knocked out under the middle of the hole's
// bottom). Places are shares of the space there, across and down.
const CLAN_HOLE = {
  right: [[0.154, 0.933], [0.44, 0.83], [0.7, 0.768], [0.824, 0.68], [0.89, 0.485]], // the hole's right edge: down to
                               // each depth, how far across it reaches (snapped to a brick's end); below the last, wall
  left: [[0.71, 0], [0.79, 4], [1, 14]], // its left edge: down to each depth, how many columns of wall
                               // are left of it (a little stepped heap of bricks)
  far: [0.21, 0.42, 0.38, 0.3], // the hills, round: the far one's middle across, its top (down), and how wide and
                               // tall it is from its middle (× the width)
  near: [0.62, 0.48, 0.5, 0.5], // the near one's
  fill: [0.22, 0.32],          // share of the far and near hill's dots lit
  sky: 0.1,                    // share of the sky's dots lit, pale blue
  tree: [0.56, 0.37, 0.575, 0.22, 12, 6, 5], // the tree: its trunk's place across, how high it reaches (down), its
                               // crown's middle across and down, the crown's half width and height in dots, and
                               // how many dots the trunk goes down into the hill
  rustle: [0.7, 1.2],          // share of the crown's dots lit, and how fast its pattern stirs
  autumn: 0.4,                 // share of the leaves yellow (the rest red)
  fallen: [45, 12, 3.5],       // leaves lying in a ring round the tree's foot, seen flattened: how many, and how
                               // far they reach across and down (dots)
  leaves: [5, [1.2, 3], [6, 12]], // loose leaves: how many at most, seconds between them, how far they blow (dots a second)
  fps: 12,
};

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
    this.side(c);
  },

  // The broken wall and the view through it, left of the card (see CLAN_HOLE).
  side(c) {
    if (!c.side) {
      c.side = document.createElement('canvas');
      c.side.className = 'clan-side';
      c.side.setAttribute('aria-hidden', 'true');
      c.canvas.parentElement.append(c.side);
    }
    const room = Math.min(CARD_MAX, Math.floor(document.documentElement.clientWidth / c.cellW) - 2 * CARD_GAP);
    const cols = room - c.cols, rows = c.rows, cv = c.side;
    c.hole = null;
    cv.style.display = c.wide && cols >= 30 ? '' : 'none';
    if (cv.style.display) return;
    Object.assign(cv.style, { left: `${-cols * c.cellW}px`, width: `${cols * c.cellW}px`, height: `${rows * c.cellH}px` });
    cv.width = Math.round(cols * c.cellW * c.dpr);
    cv.height = Math.round(rows * c.cellH * c.dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    ctx.font = `${FONT_SIZE}px ${c.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const P = CLAN_HOLE, W = cols * 2, H = rows * 4, buf = () => new Uint8Array(W * H);
    const brick = buf(), sky = buf(), edge = buf(), far = buf(), near = buf(), trunk = buf();
    // A round hill's top (in dots down) at dot x: an ellipse's, below the view off its sides.
    const hill = ([cu, top, rx, ry], x) => { const a = rx * W, b = ry * W, dx = (x - cu * W) / a; return Math.abs(dx) >= 1 ? Infinity : top * H + b * (1 - Math.sqrt(1 - dx * dx)); };
    const step = (pts, v, below) => { for (const [d, a] of pts) if (v < d) return a; return below; };
    // Where a row's bricks end (their joints line up with the card's, which starts right of here).
    const joint = (x, r) => (((x - W) + (r & 1) * CLAN_BRICK) % (CLAN_BRICK * 2) + CLAN_BRICK * 2) % (CLAN_BRICK * 2) === 0;
    const snap = (x, r) => { for (let d = 0; d < CLAN_BRICK * 2; d++) { if (joint(x - d, r)) return x - d; } return x; };
    // The hole, row by row: from which dot to which (none for rows under it).
    const span = [];
    for (let r = 0; r < rows; r++) {
      const v = (r + 0.5) / rows, right = step(P.right, v, 0);
      span.push(right ? [2 * step(P.left, v, 0), snap(Math.round(right * W), r)] : null);
    }
    // And one brick knocked out under the middle of its bottom.
    const last = span.findLastIndex(s => s);
    if (last >= 0 && last < rows - 1) {
      const mid = Math.round((span[last][0] + span[last][1]) / 2), j = snap(mid, last + 1);
      span[last + 1] = [j + 1, j + CLAN_BRICK * 2];
    }
    const inHole = (x, y) => { const s = span[y >> 2]; return !!s && x >= s[0] && x < s[1]; };
    // Its edge: down each side of a row's span, and across where it changes from row to row.
    const mark = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) edge[y * W + x] = 1; };
    for (let r = 0; r < rows; r++) {
      const s = span[r], above = r ? span[r - 1] : null;
      if (s) for (let dy = 0; dy < 4; dy++) { if (s[0] > 0) mark(s[0] - 1, 4 * r + dy); mark(s[1], 4 * r + dy); }
      // Across: the line under the row above, wherever one row has hole and the other not.
      if (r) for (let x = 0; x < W; x++) if (!!(above && x >= above[0] && x < above[1]) !== !!(s && x >= s[0] && x < s[1])) mark(x, 4 * r - 1);
    }
    if (span[rows - 1]) for (let x = span[rows - 1][0]; x < span[rows - 1][1]; x++) mark(x, H - 1);
    // The wall's border, going on from the card's: along its top, bottom and left, where it's wall.
    for (let x = 0; x < W; x++) { if (!inHole(x, 0)) mark(x, 0); if (!inHole(x, H - 1)) mark(x, H - 1); }
    for (let y = 0; y < H; y++) if (!inHole(0, y)) mark(0, y);
    // The hills (evenly dithered, their tops a solid line), the sky over them, and the wall.
    const even = (x, y, share) => BELL_BAYER[(y & 3) * 4 + (x & 3)] < share;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (inHole(x, y)) {
        const nv = hill(P.near, x), fv = hill(P.far, x);
        if (y >= nv) { if (y < nv + 1.5 || even(x, y, P.fill[1])) near[i] = 1; }
        else if (y >= fv) { if (y < fv + 1.5 || even(x, y, P.fill[0])) far[i] = 1; }
        else if (this.hash(x + 41, y + 9) < P.sky) sky[i] = 1;
        continue;
      }
      if (edge[i]) continue;
      if (y % 4 === 3 || joint(x, y >> 2)) brick[i] = 1;
    }
    // The tree's trunk, up from a little way into the near hill: two dots thick, a dot wider each
    // side at its foot (those every other dot), its very foot wider still, sparser, fading into the
    // hill, and at its top splitting into branches that spread up and out into the
    // crown. It leans right, by a character (two dots) from its foot to its top.
    const [tu, tv, cu, cv2, crx, cry, sink] = P.tree, tx = Math.round(tu * W), ty0 = Math.round(hill(P.near, tx)) + sink, ty1 = Math.round(tv * H);
    const wood = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) { const i = y * W + x; trunk[i] = 1; near[i] = sky[i] = 0; } };
    for (let y = ty1; y <= Math.min(H - 1, ty0); y++) {
      const up = ty0 - y, flare = up < 2 ? 2 : up < 5 ? 1 : 0, lean = Math.round(2 * (ty0 - y) / (ty0 - ty1));
      for (let x = tx - flare; x <= tx + 1 + flare; x++) {
        const out = x < tx ? tx - x : x > tx + 1 ? x - tx - 1 : 0;
        if (out === 1 && (x + y) & 1 || out === 2 && (x + y) % 3) continue;
        wood(x + lean, y);
      }
    }
    // Where the trunk meets the hill's top line, the line stops a dot short of it either side, so
    // the trunk stands out.
    for (let y = Math.floor(hill(P.near, tx)) - 1; y <= hill(P.near, tx) + 2; y++) {
      let x0 = W, x1 = -1;
      for (let x = tx - 4; x <= tx + 6; x++) if (trunk[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      if (x1 >= 0) { near[y * W + x0 - 1] = near[y * W + x1 + 1] = 0; }
    }
    const top = tx + 2;
    for (let k = 1; k <= 5; k++) { wood(top - k, ty1 - Math.ceil(k * 0.8)); wood(top + 1 + k, ty1 - Math.ceil(k * 0.8)); }
    for (let k = 1; k <= 4; k++) wood(top + (k & 1), ty1 - k);
    for (let k = 1; k <= 3; k++) { wood(top - 1 - k * 2, ty1 - 2 - k); wood(top + 2 + k * 2, ty1 - 3 - k); }
    // Leaves fallen round its foot, scattered over a flattened round patch of grass centred on the
    // bottom of the trunk (the same ones each time), none above the grass.
    const fallRed = buf(), fallGold = buf(), [nf, frx, fry] = P.fallen, fy = ty0;
    for (let k = 0; k < nf; k++) {
      const a = this.hash(k, 71) * 2 * Math.PI, d = Math.sqrt(0.15 + 0.85 * this.hash(k, 72));
      const x = Math.round(tx + 0.5 + Math.cos(a) * frx * d), y = Math.round(fy + Math.sin(a) * fry * d);
      if (!inHole(x, y) || trunk[y * W + x] || y < hill(P.near, x)) continue;
      near[y * W + x] = 0;
      (this.hash(k, 73) < P.autumn ? fallGold : fallRed)[y * W + x] = 1;
    }
    // The crown's dots: a lumpy cloud of overlapping round blobs, the top ones making it taller.
    const ccx = cu * W + 2, ccy = cv2 * H, crown = [];
    for (let y = Math.max(0, Math.floor(ccy - 2.2 * cry)); y <= ccy + cry + 1; y++) for (let x = Math.floor(ccx - crx - 1); x <= ccx + crx + 1; x++) {
      const blob = (dx, dy, r) => ((x - ccx - dx) / (r * crx / 10)) ** 2 + ((y - ccy - dy) / (r * cry / 10)) ** 2 < 1;
      if (blob(-5, 1, 6) || blob(4, -1, 7) || blob(0, 0.5, 9) || blob(-1, -2.5, 6) || blob(1, -4.5, 6) || blob(-5, -3.5, 4) || blob(6, -3.5, 5) || blob(-1, -7, 6) || blob(3, -9, 4) || blob(-4, -6.5, 4)) if (inHole(x, y) && !trunk[y * W + x]) crown.push(y * W + x);
    }
    // No sky shows through the crown, only gaps.
    for (const i of crown) sky[i] = 0;
    c.hole = { W, H, cols, rows, ctx, inHole, crown, ccx, ccy, layers: [[sky, '--sky'], [brick, '--faint'], [edge, '--secondary'], [far, '--hill-far'], [near, '--hill-near'], [trunk, '--tree'], [fallRed, '--leaf-red'], [fallGold, '--leaf-gold']],
      red: buf(), gold: buf(), shown: buf(), loose: [], next: 0, drawn: -1 };
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) this.cellAt(c, col, r);
    this.leaves(c, 0);
  },

  // One cell of the side: its still layers, then the leaves, in their colours.
  cellAt(c, col, r) {
    const h = c.hole, x = col * c.cellW, y = r * c.cellH;
    h.ctx.clearRect(x, y, c.cellW, c.cellH);
    for (const [b, color] of [...h.layers, [h.red, '--leaf-red'], [h.gold, '--leaf-gold']]) {
      const ch = Cards.cell(b, h.W, col, r);
      if (ch !== '\u2800') { h.ctx.fillStyle = c.color(color); h.ctx.fillText(ch, x + c.cellW / 2, y + c.cellH / 2); }
    }
  },

  // The leaves at time t, autumn red and yellow (each dot always the same one): the crown's dots
  // lit by a slowly stirring pattern (so it rustles), and
  // loose leaves blowing off it now and then, drifting left and down, fluttering, till they leave
  // the hole. Only the cells that changed are redrawn.
  leaves(c, t) {
    const h = c.hole, P = CLAN_HOLE, [share, speed] = P.rustle, [most, [g0, g1], [s0, s1]] = P.leaves, W = h.W;
    h.red.fill(0);
    h.gold.fill(0);
    const leaf = (i, k) => { (k < P.autumn ? h.gold : h.red)[i] = 1; };
    for (const i of h.crown) {
      const x = i % W, y = (i - x) / W;
      const n = Math.sin(x * 0.7 + t * speed * 2.3) + Math.sin(y * 1.3 - t * speed * 1.7 + x * 0.3) + Math.sin((x + y) * 0.4 + t * speed);
      if (this.hash(x + 77, y + 3) < share + 0.25 * n / 3) leaf(i, this.hash(x + 5, y + 51));
    }
    if (t >= h.next && h.loose.length < most) {
      const k = Math.floor(t * 10);
      h.loose.push({ t0: t, x: h.ccx + (this.hash(k, 1) - 0.5) * 16, y: h.ccy + (this.hash(k, 2) - 0.2) * 4, v: s0 + (s1 - s0) * this.hash(k, 3), ph: this.hash(k, 4) * 6 });
      h.next = t + g0 + (g1 - g0) * this.hash(k, 5);
    }
    h.loose = h.loose.filter(p => {
      const a = t - p.t0, x = Math.round(p.x - p.v * a), y = Math.round(p.y + a * 2.2 + Math.sin(a * 3 + p.ph) * 1.5);
      if (x < 0 || y < 0 || y >= h.H || !h.inHole(x, y)) return false;
      leaf(y * W + x, p.ph / 6);
      return true;
    });
    for (let i = 0; i < h.shown.length; i++) {
      const now = h.red[i] + 2 * h.gold[i];
      if (now === h.shown[i]) continue;
      h.shown[i] = now;
      const x = i % W, y = (i - x) / W, key = (y >> 2) * h.cols + (x >> 1);
      if (key !== h.drawn) { h.drawn = key; this.cellAt(c, x >> 1, y >> 2); }
    }
  },

  tick(c, t) {
    if (!c.hole || t - (c.holeAt ?? -1) < 1 / CLAN_HOLE.fps) return;
    c.holeAt = t;
    c.hole.drawn = -1;
    this.leaves(c, t);
  },
};
