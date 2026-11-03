// Dandelion card (unfinished commercial project): a light blue sky, dithered and not filled in like
// Lonely Bell Sound's, with whiteish clouds holding the text: the title, year and kind in one at the
// top left, the description in one lower down on the right (where the screen is too narrow for them
// side by side, under it; on phones all of it in one big cloud). Along the bottom a field of flowers,
// red, yellow, purple and blue, in clumps: daisies, roses, peonies and tulips drawn like a quick
// sketch, an outline over a light wash, on curving stems that lean this way and that, with leaves on
// small sprigs; the nearer ones in front, and grass growing over their feet on green ground. The
// clouds drift slowly, their puffs swelling and their bottoms rippling in waves that run along them.
// At night the sky darkens and it rains from the clouds onto the flowers.
const DANDELION_LINK = '\u21AA\uFE0E'; // hooked arrow after the title, linking to the game
const DANDELION_PAD = [3, 1];    // cells between a cloud's text and the edge of its body: columns, rows
const DANDELION_RAISE = 4;       // dots a cloud's text sits higher in it than its box: the puffs make its top taller, so this centers it
const DANDELION_SIDE = 7;        // columns from the card's edge to a cloud's text (its padding and round end)
const DANDELION_TEXT = [28, 44]; // least and most columns the description is wide beside the title's cloud
const DANDELION_TOP = 2;         // rows above the first cloud's text (with DANDELION_RAISE, room for its puffs)
const DANDELION_GAP = 1;         // rows between the lowest cloud's text and the top of the flower field
const DANDELION_DROP = 2;        // rows the ground steps down under the description's cloud, beside the title's
const DANDELION_SLOPE = 24;      // dots across the slope down between them
const DANDELION_CLEAR = 4;       // least dots between a cloud's lowest reach and a flower under it (room for the rain)
const DANDELION_FLOWERS = 10;     // rows of ground and flowers at the bottom
const DANDELION_SKY = [0.3, 0.06]; // share of the sky's dots lit at the top and just above the flowers
const DANDELION_FILL = [0.45, 0.5]; // share of a cloud's dots lit inside it, and along its underside
const DANDELION_DRIFT = {       // the clouds' motion:
  fps: 12,                       // times a second they are redrawn
  shift: 3,                      // most dots a cloud drifts sideways
  period: [10, 16],              // least and most seconds one drift to and fro takes, per cloud
  wave: 1,                       // dots its puffs swell and shrink by, and its bottom ripples
  speed: 0.9,                    // how fast those waves run along it, radians a second
};
const DANDELION_RAIN = [0.3, 40, 70]; // at night: drops per column under the clouds, least and most speed (dots a second)
const DANDELION_COLORS = ['--flower-red', '--flower-yellow', '--flower-purple', '--flower-blue'];
const DANDELION_FIELD = {       // the flower field:
  gap: [2, 8], clump: [0.12, 10, 18], // dots between neighbouring stems; now and then (share) a wider gap between clumps
  size: [6, 8],                  // least and most radius of a flower's head, dots
  lean: 0.4,                     // most a stem leans to the side, × its height
  bend: 4,                       // most dots a stem bows out in its middle
  leaves: [0, 2],                // least and most leaves on a stem
  wash: 0.3,                     // share of a head's inside dotted in its light wash (evenly)
  kinds: ['daisy', 'rose', 'peony', 'tulip'],
};

CARD_DESIGNS.dandelion = {
  layout(c) {
    const field = name => c.fields.find(f => f[0] === name)?.[1] ?? '';
    const side = DANDELION_SIDE, cols = c.cols, [least, most] = DANDELION_TEXT;
    const widest = lines => Math.max(...lines.map(([t]) => t.length));
    const wrap = (text, w, color) => Cards.wrap(text, w).map(t => [t, color]);
    // A cloud: its text's lines from (col, row), and the box they take.
    c.lines = [];
    c.clouds = [];
    c.drop = 0;
    // The title's line is two columns wider for the link after it.
    const title = field('Title'), wide = lines => Math.max(widest(lines), lines[0][0] === title ? title.length + 2 : 0);
    // raise: dots its text sits higher in it than its box.
    const cloud = (col, row, lines, raise = DANDELION_RAISE) => {
      lines.forEach(([text, color], i) => { if (text) c.lines.push({ text, color, col, row: row + i }); });
      c.clouds.push({ col, row, w: wide(lines), h: lines.length, raise });
    };
    const head = w => [[title, '--main'], [field('Year'), '--secondary'], ...wrap(field('Kind'), w, '--secondary')];

    if (c.stacked) {
      // One big cloud, in the middle.
      const w = cols - 2 * side, lines = [...head(w), ['', ''], ...wrap(field('Description'), w, '--main')];
      cloud(Math.floor((cols - wide(lines)) / 2), DANDELION_TOP, lines);
    } else {
      const top = head(cols), right = side + wide(top) + side;
      cloud(side, DANDELION_TOP, top);
      // The description to the right, its first line by the title's last; or, without the room for
      // it there, under the title's cloud. (Its cloud's round end takes `side` columns too, and a
      // blank column keeps the two clouds apart.) Its cloud sits a row higher round its text than
      // the others.
      const dw = Math.min(most, cols - right - 2 * side - 1);
      if (dw >= least) c.drop = DANDELION_DROP;
      const body = wrap(field('Description'), dw >= least ? dw : Math.min(most, cols - 2 * side), '--main');
      const row = dw >= least ? DANDELION_TOP + top.length - 1 : DANDELION_TOP + top.length + 2 * DANDELION_PAD[1] + 4;
      cloud(cols - side - widest(body), row, body, 0);
    }
    const t = c.lines[0];
    c.lines.splice(1, 0, { text: DANDELION_LINK, color: '--link', col: t.col + title.length + 1, row: t.row });
    return Math.max(...c.clouds.map(b => b.row + b.h)) + DANDELION_GAP + DANDELION_FLOWERS + c.drop;
  },

  draw(c) {
    const { cols, rows } = c, W = cols * 2, H = rows * 4, [px, py] = DANDELION_PAD;
    const buf = () => new Uint8Array(W * H);
    const skyHigh = buf(), skyLow = buf(), fill = buf(), under = buf(), edge = buf(), rain = buf();
    const inCloud = buf();
    // Fixed random numbers, so the clouds and flowers stay the same between redraws.
    let seed = 11;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647, between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

    // Each cloud: the box round its text with a flat bottom, a round end at each side, and a few big
    // round puffs along its top, overlapping (each an ellipse: x, y, x radius, y radius, and when it
    // swells). How it drifts: its period and phase. Drawn by clouds().
    const D = DANDELION_DRIFT;
    c.shapes = c.clouds.map(b => {
      const X0 = 2 * (b.col - px), X1 = 2 * (b.col + b.w + px) - 1, Y0 = 4 * (b.row - py) + b.raise, Y1 = 4 * (b.row + b.h + py) - 1 + b.raise;
      const ry = (Y1 - Y0) / 2, rx = Math.min(8, ry + 1), blobs = [[X0, Y0 + ry, rx, ry + 1], [X1, Y0 + ry, rx, ry + 1]];
      for (let x = X0 + 4; x < X1 - 3; x += between(10, 14)) { const r = between(8, 11); blobs.push([x, Y0 + r - between(4, 8), r, r]); }
      return { X0, X1, Y0, Y1, blobs, period: D.period[0] + rnd() * (D.period[1] - D.period[0]), phase: rnd() * 6.3 };
    });

    // The flower field, painted dot by dot (each dot one color of `palette`, later ones over earlier
    // ones): flowers from the back (highest heads) to the front, then grass over their feet.
    const paint = new Uint8Array(W * H), palette = [null];
    const ink = color => { let k = palette.indexOf(color); if (k < 0) { k = palette.length; palette.push(color); } return k; };
    const put = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) paint[y * W + x] = k; };
    // A curve from a to b, bowing toward q.
    const curve = (ax, ay, qx, qy, bx, by, k) => {
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1;
      for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; put(u * u * ax + 2 * u * t * qx + t * t * bx, u * u * ay + 2 * u * t * qy + t * t * by, k); }
    };
    const F = DANDELION_FIELD, bg = c.color('--bg'), heavy = c.color('--heavy');
    // Under each column, the lowest a cloud reaches, however it drifts and ripples: flowers keep
    // DANDELION_CLEAR dots below that, so under a low cloud they stand lower.
    const cloudLow = new Int16Array(W).fill(-1), reach = DANDELION_DRIFT.shift + DANDELION_DRIFT.wave + 9;
    for (const k of c.shapes) for (let x = Math.max(0, k.X0 - reach); x <= Math.min(W - 1, k.X1 + reach); x++) cloudLow[x] = Math.max(cloudLow[x], k.Y1 + 2);
    // How far the ground is raised in each column, in dots: with the clouds side by side, it is
    // high under the title's and slopes down between them to the card's bottom under the description's.
    const lift = new Int16Array(W);
    if (c.drop) {
      const [a, b] = c.shapes, mid = (a.X1 + b.X0) / 2;
      for (let x = 0; x < W; x++) {
        const u = Math.min(1, Math.max(0, (x - mid) / DANDELION_SLOPE + 0.5));
        lift[x] = Math.round(c.drop * 4 * (1 - u * u * (3 - 2 * u)));
      }
    }
    const flowers = [];
    const headX = (f, cy) => Math.max(f.R, Math.min(W - 1 - f.R, f.x + f.lean * (f.base - cy)));
    for (let x = between(1, 5); x < W - 2; x += rnd() < F.clump[0] ? between(F.clump[1], F.clump[2]) : between(...F.gap)) {
      const R = between(...F.size), up = lift[x], top = H - DANDELION_FLOWERS * 4 + R + 1 - up;
      const f = { x, R, base: H - 2 - up, cy: top + rnd() * (H - 10 - up - top), lean: (rnd() * 2 - 1) * F.lean, bend: (rnd() * 2 - 1) * F.bend,
        kind: F.kinds[between(0, F.kinds.length - 1)], color: c.color(DANDELION_COLORS[(flowers.length + between(0, 1) * 2) % 4]), leaves: between(...F.leaves), side: rnd() < 0.5 ? -1 : 1 };
      // Twice, as moving the head down also moves it sideways along its leaning stem.
      for (let k = 0; k < 2; k++) {
        const cx = Math.round(headX(f, f.cy));
        let low = -1;
        for (let xx = Math.max(0, cx - R - 1); xx <= Math.min(W - 1, cx + R + 1); xx++) low = Math.max(low, cloudLow[xx]);
        f.cy = Math.min(f.base - 8, Math.max(f.cy, low + DANDELION_CLEAR + R));
      }
      flowers.push(f);
    }
    flowers.sort((a, b) => a.cy - b.cy);
    const stemInk = ink(c.color('--stem')), leafInk = ink(c.color('--leaf'));
    for (const f of flowers) {
      const base = f.base, cx = headX(f, f.cy), rot = Math.atan2(cx - f.x, base - f.cy) * 0.8;
      // The stem, up to the bottom of the head (tilted with the stem), bowing out to one side.
      const sx = cx - Math.sin(rot) * f.R * 0.8, sy = f.cy + Math.cos(rot) * f.R * 0.8;
      const qx = (f.x + sx) / 2 + f.bend, qy = (base + sy) / 2;
      curve(f.x, base, qx, qy, sx, sy, stemInk);
      // Leaves on short sprigs off the stem's lower half, on alternate sides, pointing up and out.
      for (let k = 0; k < f.leaves; k++) {
        const t = 0.25 + 0.3 * k + 0.1 * rnd(), u = 1 - t, s = k % 2 ? -f.side : f.side;
        const ax = u * u * f.x + 2 * u * t * qx + t * t * sx, ay = u * u * base + 2 * u * t * qy + t * t * sy;
        const dx = s * 0.8, dy = -0.6, ex = ax + dx * 2, ey = ay + dy * 2;
        curve(ax, ay, ax + dx, ay + dy, ex, ey, stemInk);
        for (let i = 0; i <= 7; i++) for (let j = -2; j <= 2; j++) if (Math.abs(j) <= Math.sin(Math.PI * i / 7) * 2.2) put(ex + dx * i - dy * j * 0.7, ey + dy * i + dx * j * 0.7, leafInk);
      }
      this.head(f, cx, rot, put, ink, { bg, heavy, middle: c.color('--flower-middle') }, W, H, F.wash);
    }
    // The ground: two rows of earth (where it is raised, a sparser bank of it down to the card's
    // bottom), and strands of grass on it, leaning this way and that.
    const earthInk = ink(c.color('--earth')), grassInk = ink(c.color('--grass'));
    for (let x = 0; x < W; x++) {
      const gy = H - 1 - lift[x];
      for (let y = gy + 1; y < H; y++) if (this.hash(x + 7, y + 31) < 0.3) put(x, y, earthInk);
      if (this.hash(x, 1) < 0.9) put(x, gy, earthInk);
      if (this.hash(x, 2) < 0.7) put(x, gy - 1, earthInk);
      if (this.hash(x, 3) < 0.6) {
        const tall = 1 + Math.floor(this.hash(x, 4) * 5), lean = Math.floor(this.hash(x, 6) * 3) - 1;
        for (let k = 0; k < tall; k++) put(x + (k > 1 ? lean : 0) + (k > 3 ? lean : 0), gy - 2 - k, k < 2 ? earthInk : grassInk);
      }
    }
    // In each column, the lowest dot the rain reaches: just above the field.
    const ground = new Int16Array(W).fill(H - 1);
    for (let x = 0; x < W; x++) for (let y = H - (DANDELION_FLOWERS + c.drop) * 4; y < H; y++) if (paint[y * W + x]) { ground[x] = y - 1; break; }
    const field = palette.map((color, k) => {
      const b = buf();
      if (k) for (let i = 0; i < W * H; i++) if (paint[i] === k) b[i] = 1;
      return [b, color];
    }).slice(1);

    // The sky down to the flowers: dots spread evenly (ordered dithering), most at the top and fewer
    // lower down, in light blue paling toward the flowers. clouds() leaves out the ones in or right
    // next to a cloud.
    const skyEnd = H - DANDELION_FLOWERS * 4, [s0, s1] = DANDELION_SKY, skyAll = [buf(), buf()];
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < ground[x] - 1; y++) {
        const u = Math.min(1, y / skyEnd);
        if (BELL_BAYER[(y & 3) * 4 + (x & 3)] < s0 + (s1 - s0) * u) skyAll[u + this.hash(x + 5, y + 9) - 0.5 < 0.5 ? 0 : 1][y * W + x] = 1;
      }
    }

    // The part of the card the clouds can reach, however they drift and swell.
    const m = D.shift + D.wave + 9;
    c.region = [
      Math.max(0, Math.min(...c.shapes.map(k => k.X0)) - m), Math.max(0, Math.min(...c.shapes.map(k => k.Y0)) - 12),
      Math.min(W - 1, Math.max(...c.shapes.map(k => k.X1)) + m), Math.min(H - 1, Math.max(...c.shapes.map(k => k.Y1)) + 5),
    ];
    Object.assign(c, {
      W, H, night: Theme.dark, skyAll, inCloud, skyHigh, skyLow, under, fill, edge, ground, sig: new Map(),
      from: new Int16Array(W).fill(-1), xs: [],
      layers: [[rain, '--rain'], [skyHigh, '--sky-light'], [skyLow, '--sky-pale'], [under, '--cloud-under'], [fill, '--cloud'], [edge, '--cloud-edge'], ...field],
    });
    this.clouds(c, 0);
    // At night the rain: drops falling from each column's lowest cloud dot down to the flowers.
    c.rain = null;
    if (c.night) {
      c.rain = { dots: rain, last: -1, drops: [] };
      for (let k = Math.round(c.xs.length * DANDELION_RAIN[0]); k > 0; k--) c.rain.drops.push(this.drop(c, {}, true));
    }
    c.text = new Set();
    for (const l of c.lines) for (let i = 0; i < l.text.length; i++) c.text.add(l.row * cols + l.col + i);
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) this.cell(c, col, r);
    for (const l of c.lines) Cards.text(c, l.text, l.col, l.row, l.color);
    c.cellLinks.push([c.lines[1].col, c.lines[1].row, 1, `${c.lines[0].text} on Steam`]);
  },

  // A flower's head, centered at (cx, f.cy), tilted by `rot`: first everything behind it is cleared,
  // then a light wash (dotted, not filled) inside its outline, the outline in the flower's color, and
  // its inner lines a little deeper. Kinds: a daisy (petals round a middle), a rose (curved petals), a
  // peony (ruffled, a ring of petals inside) and a tulip (a cup with three points).
  head(f, cx, rot, put, ink, { bg, heavy, middle: mid }, W, H, wash) {
    const { R, cy, kind, color } = f, cos = Math.cos(rot), sin = Math.sin(rot);
    const line = ink(color), light = ink(Cards.mix(color, bg, 0.55)), deep = ink(Cards.mix(color, heavy, 0.35)), middle = ink(mid);
    const local = (x, y) => { const dx = x - cx, dy = y - cy; return [dx * cos + dy * sin, -dx * sin + dy * cos]; };
    const inside = (x, y) => {
      const [u, v] = local(x, y), d = Math.hypot(u, v), a = Math.atan2(v, u);
      if (kind === 'daisy') return d <= R * (0.8 + 0.2 * Math.abs(Math.cos(a * 4)));
      if (kind === 'rose') return d <= R * (0.92 + 0.08 * Math.sin(a * 5));
      if (kind === 'peony') return d <= R * (0.85 + 0.15 * Math.abs(Math.sin(a * 5)));
      if (v >= -0.2 * R) return (u / (0.8 * R)) ** 2 + ((v + 0.2 * R) / (0.95 * R)) ** 2 <= 1;
      return Math.abs(u) <= 0.8 * R && v >= -R * (0.55 + 0.45 * Math.abs(Math.cos(Math.PI * u / (0.8 * R))));
    };
    // Inner lines: what a dot inside shows, if not the wash.
    const inner = (x, y) => {
      const [u, v] = local(x, y), d = Math.hypot(u, v), a = Math.atan2(v, u);
      if (kind === 'daisy') return d < R * 0.3 ? middle : d > R * 0.3 && Math.abs(Math.cos(a * 4)) < 0.2 ? deep : 0;
      // A rose's petals: two curved arcs, open on opposite sides, round a small middle.
      if (kind === 'rose') {
        if (d < R * 0.15) return deep;
        if (Math.abs(d - R * 0.35) < 0.5 && Math.cos(a - 1) < 0.5) return deep;
        return Math.abs(d - R * 0.62) < 0.5 && Math.cos(a + 2) < 0.6 ? deep : 0;
      }
      if (kind === 'peony') return d < R * 0.22 ? deep : Math.abs(d - R * 0.55 * (1 + 0.12 * Math.sin(a * 7))) < 0.5 ? deep : 0;
      return Math.abs(Math.abs(u) - 0.3 * R) < 0.45 && v > -0.45 * R && v < 0.6 * R ? deep : 0;
    };
    for (let y = Math.floor(cy - R - 2); y <= cy + R + 2; y++) {
      for (let x = Math.floor(cx - R - 2); x <= cx + R + 2; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || !inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        put(x, y, edge ? line : inner(x, y) || (BELL_BAYER[(y & 3) * 4 + (x & 3)] < wash ? light : 0));
      }
    }
  },

  // The clouds at time t, in their region of the card: each drifted sideways by its own sway, its puffs
  // swelling and shrinking and its bottom rippling in waves that run along it. Sets their dots (the
  // fill moving with the cloud), leaves the sky out in and right next to them, notes each column's
  // lowest cloud dot for the rain, and returns the cells that changed.
  clouds(c, t) {
    const { W, inCloud, edge, fill, under, skyHigh, skyLow, skyAll, from, region: [x0, y0, x1, y1] } = c, D = DANDELION_DRIFT;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        inCloud[i] = edge[i] = fill[i] = under[i] = 0;
        skyHigh[i] = skyAll[0][i];
        skyLow[i] = skyAll[1][i];
      }
    }
    const shifts = c.shapes.map((k, n) => {
      const dx = Math.round(D.shift * Math.sin(2 * Math.PI * t / k.period + k.phase));
      const wave = x => D.wave * Math.sin(t * D.speed - x * 0.35);
      const blobs = k.blobs.map(([bx, by, rx, ry]) => { const w = wave(bx); return [bx, by, rx + w, ry + w]; });
      for (let y = Math.max(y0, k.Y0 - 10); y <= Math.min(y1, k.Y1 + 3); y++) {
        for (let x = Math.max(x0, k.X0 - 10 + dx); x <= Math.min(x1, k.X1 + 10 + dx); x++) {
          const lx = x - dx, ly = y;
          if ((lx >= k.X0 && lx <= k.X1 && ly >= k.Y0 && ly <= k.Y1 + wave(lx) * 0.8) || blobs.some(([bx, by, rx, ry]) => ((lx - bx) / rx) ** 2 + ((ly - by) / ry) ** 2 <= 1)) inCloud[y * W + x] = n + 1;
        }
      }
      return dx;
    });
    const cloudy = (x, y) => x >= x0 && y >= y0 && x <= x1 && y <= y1 && inCloud[y * W + x] > 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x, near = cloudy(x, y) || cloudy(x - 1, y) || cloudy(x + 1, y) || cloudy(x, y - 1) || cloudy(x, y + 1);
        if (near) skyHigh[i] = skyLow[i] = 0;
        if (!inCloud[i]) continue;
        // The outline, and inside, a light fill, a little denser and grayer along the underside.
        const dx = shifts[inCloud[i] - 1], bayer = BELL_BAYER[(y & 3) * 4 + ((x - dx) & 3)];
        if (!cloudy(x - 1, y) || !cloudy(x + 1, y) || !cloudy(x, y - 1) || !cloudy(x, y + 1)) edge[i] = 1;
        else if (!cloudy(x, y + 3)) { if (bayer < DANDELION_FILL[1]) under[i] = 1; }
        else if (bayer < DANDELION_FILL[0]) fill[i] = 1;
      }
    }
    c.xs = [];
    for (let x = x0; x <= x1; x++) {
      from[x] = -1;
      for (let y = y1; y >= y0; y--) if (inCloud[y * W + x]) { from[x] = y; c.xs.push(x); break; }
    }
    // The cells whose dots changed since last time.
    const dirty = [], layers = [skyHigh, skyLow, under, fill, edge];
    for (let r = y0 >> 2; r <= y1 >> 2; r++) {
      for (let col = x0 >> 1; col <= x1 >> 1; col++) {
        const k = r * c.cols + col, sig = layers.map(b => Cards.cell(b, W, col, r)).join('');
        if (c.sig.get(k) !== sig) { c.sig.set(k, sig); dirty.push(k); }
      }
    }
    return dirty;
  },

  // A raindrop starting under a random cloud column, at the cloud or, with `anywhere`, partway down.
  drop(c, d, anywhere) {
    const [, v0, v1] = DANDELION_RAIN;
    d.x = c.xs[Math.floor(Math.random() * c.xs.length)];
    d.v = v0 + Math.random() * (v1 - v0);
    const y0 = c.from[d.x] + 1;
    d.y = anywhere ? y0 + Math.random() * (c.ground[d.x] - y0) : y0;
    return d;
  },

  // Draws one cell: each layer in its own color. Text cells show only their letters.
  cell(c, col, r) {
    if (c.text.has(r * c.cols + col)) return;
    Cards.clear(c, col, r, 1, 1);
    for (const [b, color] of c.layers) {
      const ch = Cards.cell(b, c.W, col, r);
      if (ch !== '⠀') Cards.text(c, ch, col, r, color);
    }
  },

  // A fixed pseudo-random value 0..1 for a dot position.
  hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },

  // The clouds drift and ripple, a few times a second. At night the rain falls: each drop two dots
  // long, starting again under a cloud when it reaches the flowers. Only cells that change are redrawn.
  tick(c, t) {
    const dirty = new Set();
    if (t - (c.cloudLast ?? -1) >= 1 / DANDELION_DRIFT.fps) {
      c.cloudLast = t;
      for (const k of this.clouds(c, t)) dirty.add(k);
    }
    const rain = c.rain;
    if (rain) {
      const dt = rain.last < 0 ? 0 : Math.min(0.1, t - rain.last), W = c.W;
      rain.last = t;
      const put = (d, on) => {
        for (let k = 0; k < 2; k++) {
          const y = Math.floor(d.y) - k;
          if (y < 0 || on && y <= c.from[d.x]) continue;
          rain.dots[y * W + d.x] = on;
          dirty.add((y >> 2) * c.cols + (d.x >> 1));
        }
      };
      for (const d of rain.drops) {
        put(d, 0);
        d.y += d.v * dt;
        if (d.y > c.ground[d.x] || c.from[d.x] < 0) this.drop(c, d, false);
      }
      for (const d of rain.drops) put(d, 1);
    }
    for (const cell of dirty) this.cell(c, cell % c.cols, Math.floor(cell / c.cols));
  },
};
