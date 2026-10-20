// Fish layer: hammerhead sharks and one school of fish swimming under the surface, seen from above.
// A body is a chain of joints pulled along by the head, with a swimming wave growing toward the tail.
// Its outline is a set of tapered capsules around the chain, filled with grainy random dots (dense
// deep inside, thinner toward the edges). Each cell takes a shade of the body color by how deep
// inside the body it is, darker at the sides and lighter along the back like light from above,
// jittered per cell so the color is noisy rather than smooth.
const SWIM_SIZE_REF = 180;     // dots; shorter screen side at which animals have full size
const SWIM_SIZE_MIN = 0.7;     // smallest size factor (phones)
const SWIM_SIZE_MAX = 1.5;     // largest size factor (big screens)
const SWIM_SPAWN_WAIT = [3, 10]; // s, random wait before the next arrival
const SWIM_GIVE_UP = 20;       // s, an animal that never entered the screen by then is dropped
const SWIM_DENSE_CORE = 1;     // share of dots on deep inside a body
const SWIM_CORE = 2.5;         // dots in from the edge where the core density is reached
const SWIM_MIN_RADIUS = 0.7;   // dots, thinnest a fin or tail may get
const SWIM_SHADES = 6;         // shades per body color, from the sides to the back
const SWIM_DARKEN = 0.6;       // how far the side shade moves toward --shade-dark
const SWIM_LIGHTEN = 0.55;     // how far the back shade moves toward --bg
const SWIM_JITTER = 2.5;       // shades of random jitter per cell

const SHARK_LEN = 64;          // dots, hammer to tail tip, at full size
const SHARK_SIZES = [0.75, 1.3]; // size range between sharks, × SHARK_LEN
const SHARK_MIN = 2;           // fewest sharks at once; below this one arrives right away
const SHARK_EDGE = 0.7;        // share of dots on at a shark's body edge
const SHARK_SPEED = 0.2;       // body lengths per second
const SHARK_TURN = 0.25;       // rad/s, strongest wander turn
const SHARK_AREA = 30000;      // dots² of screen per shark
const SHARK_MAX = 3;           // most sharks at once
const SHARK_SPINE = 0.75;      // share of the length covered by joints; the tail fin covers the rest
const SHARK_WIDTH = [0.035, 0.05, 0.068, 0.078, 0.075, 0.064, 0.05, 0.036, 0.025, 0.017]; // half-width per joint, × length
const SHARK_AMP = 0.05;        // tail swing, × length
const SHARK_BEAT = 0.5;        // Hz, tail beats at cruising speed
const SHARK_COLORS = ['--shark-1', '--shark-2', '--shark-3'];

const FISH_LEN = 5;            // dots, nose to tail, at full size: a tiny critter
const FISH_SIZES = [0.6, 1.5]; // size range between fish, × FISH_LEN
const FISH_SPEED = 2.75;       // body lengths per second, cruising
const FISH_FLEE = 8;           // body lengths per second, top speed with a shark near
const FISH_FEAR = 0.7;         // shark lengths, distance at which fish start fleeing
const FISH_SPINE = 1;          // share of the length covered by joints (no tail fin)
const FISH_WIDTH = [0.2, 0.24, 0.16, 0.08]; // half-width per joint, × length
const FISH_AMP = 0.02;         // body swing, × length
const FISH_BEAT = 1.5;         // Hz, body beats at cruising speed
const FISH_EDGE = 1;           // share of dots on at a fish's body edge (small, so solid)
const SCHOOL_AREA = 800;       // dots² of screen per fish in the one school
const SCHOOL_MIN = 10;         // fewest fish in the school
const SCHOOL_MARGIN = 0.2;     // share of the screen near its edges where the school turns back
const SCHOOL_TURN = 1.5;       // rad/s, how fast the school turns back toward the middle
const SCHOOL_REACH = 6;        // fish lengths, how far a fish sees its schoolmates
const SCHOOL_SPACE = [1.2, 3]; // fish lengths, personal space, picked per fish
const FISH_WANDER = 1.5;       // sideways push of each fish's own weaving, × cruise speed
const FISH_DART_RATE = 0.08;   // darts per second per fish
const FISH_DART_TIME = 0.5;    // s a dart lasts
const FISH_DART_PUSH = 6;      // push during a dart, × cruise speed

const SWIM_WAVE = Math.PI * 1.6; // phase change along the spine: 0.8 waves per body

const Fish = {
  sharks: [],
  school: null,                // the one school all fish swim in
  sharkWait: 0.5,
  scale: 1,
  started: false,              // first frame fills the screen right away
  sharkShades: null,           // per shark color, ink indexes from the sides to the back
  fishShades: null,            // ink indexes from the sides to the back
  level: null,                 // scratch, deepest shade drawn per cell for the current animal
  grain: null,                 // Float32Array(w * h), fixed per-dot threshold 0..1 for the body fill
  jitter: null,                // Float32Array(cols * rows), fixed per-cell shade offset
  shade: null,                 // scratch, signed distance in dots to the body edge over an animal's box
  caps: new Float32Array(6 * 24), // scratch capsules: ax, ay, ar, bx, by, br
  ncaps: 0,
  pose: new Float32Array(2 * 10), // scratch joints with the wave applied
  dirs: new Float32Array(2 * 10), // scratch forward direction per posed joint

  resize(frame) {
    this.scale = Math.min(SWIM_SIZE_MAX, Math.max(SWIM_SIZE_MIN, Math.min(frame.w, frame.h) / SWIM_SIZE_REF));
    this.shade = new Float32Array(frame.w * frame.h);
    this.sharkShades = SHARK_COLORS.map(c => this.shades(frame, c));
    this.fishShades = this.shades(frame, '--fish');
    this.level = new Int8Array(frame.cols * frame.rows);
    this.grain = new Float32Array(frame.w * frame.h);
    for (let i = 0; i < this.grain.length; i++) this.grain[i] = Math.random();
    this.jitter = new Float32Array(frame.cols * frame.rows);
    for (let i = 0; i < this.jitter.length; i++) this.jitter[i] = (Math.random() - 0.5) * SWIM_JITTER;
  },

  update(frame, dt, t) {
    const area = frame.w * frame.h;
    const sharks = Math.min(SHARK_MAX, Math.max(SHARK_MIN, Math.round(area / SHARK_AREA)));

    if (!this.started) {
      this.started = true;
      while (this.sharks.length < sharks) this.sharks.push(this.newShark(frame, true));
      this.school = this.newSchool(frame, true);
    }

    this.sharkWait -= dt;
    if (this.sharks.length < SHARK_MIN || this.sharkWait <= 0 && this.sharks.length < sharks) {
      this.sharks.push(this.newShark(frame));
      this.sharkWait = this.rand(SWIM_SPAWN_WAIT);
    }

    for (let i = this.sharks.length - 1; i >= 0; i--) {
      const s = this.sharks[i];
      s.a += SHARK_TURN * (Math.sin(t * 0.21 + s.p1) + Math.sin(t * 0.37 + s.p2)) / 2 * dt;
      s.x += Math.cos(s.a) * s.speed * dt;
      s.y += Math.sin(s.a) * s.speed * dt;
      s.phase += 2 * Math.PI * SHARK_BEAT * dt;
      this.move(s, frame, dt);
      if (s.done) this.sharks.splice(i, 1);
    }

    const school = this.school;
    school.a += 0.3 * Math.sin(t * 0.17 + school.p1) * dt;
    // The school roams the screen: near an edge it turns back toward the middle.
    let mx = 0, my = 0;
    for (const f of school.fish) { mx += f.x; my += f.y; }
    school.mx = mx /= school.fish.length;
    school.my = my /= school.fish.length;
    const { w, h } = frame, m = SCHOOL_MARGIN;
    if (mx < w * m || mx > w * (1 - m) || my < h * m || my > h * (1 - m)) {
      const d = Math.atan2(h / 2 - my, w / 2 - mx) - school.a;
      const turn = Math.atan2(Math.sin(d), Math.cos(d));
      school.a += Math.sign(turn) * Math.min(Math.abs(turn), SCHOOL_TURN * dt);
    }
    // A school that feels a shark turns away from it as a whole.
    if (school.fx || school.fy) school.a = Math.atan2(Math.sin(school.a) + school.fy * dt, Math.cos(school.a) + school.fx * dt);
    school.fx = school.fy = 0;
    // Fish are never dropped: a stray swims back to the school (see steer).
    for (const f of school.fish) {
      this.steer(f, school, frame, dt);
      this.move(f, frame, dt);
    }
  },

  draw(frame) {
    for (const f of this.school.fish) {
      this.posed(f);
      this.fishShape(f);
      this.raster(frame, this.fishShades, FISH_EDGE);
    }
    for (const s of this.sharks) {
      this.posed(s);
      this.sharkShape(s);
      this.raster(frame, this.sharkShades[s.color], SHARK_EDGE);
    }
  },

  // An animal just outside a random edge, heading into the screen within ±0.5 rad of straight in,
  // or, with onScreen, anywhere on the screen heading anywhere.
  animal(frame, len, widths, spine, amp, cruise, out, onScreen) {
    const { w, h } = frame;
    const side = Math.random() * 2 * (w + h);
    let x, y, a;
    if (onScreen) { x = Math.random() * w; y = Math.random() * h; a = Math.random() * 2 * Math.PI; }
    else if (side < w) { x = side; y = -out; a = Math.PI / 2; }
    else if (side < 2 * w) { x = side - w; y = h + out; a = -Math.PI / 2; }
    else if (side < 2 * w + h) { x = -out; y = side - 2 * w; a = 0; }
    else { x = w + out; y = side - 2 * w - h; a = Math.PI; }
    if (!onScreen) a += Math.random() - 0.5;
    const n = widths.length;
    const seg = len * spine / (n - 1);
    const joints = new Float32Array(2 * n);
    for (let i = 0; i < n; i++) {
      joints[2 * i] = x - Math.cos(a) * seg * i;
      joints[2 * i + 1] = y - Math.sin(a) * seg * i;
    }
    return {
      x, y, a, len, widths, amp, seg, joints, cruise,
      speed: cruise, phase: Math.random() * 6.3, age: 0, entered: false, done: false,
    };
  },

  newShark(frame, onScreen) {
    const len = SHARK_LEN * this.scale * this.rand(SHARK_SIZES);
    const s = this.animal(frame, len, SHARK_WIDTH, SHARK_SPINE, SHARK_AMP, len * SHARK_SPEED * (0.8 + 0.4 * Math.random()), len * 0.3, onScreen);
    s.color = Math.floor(Math.random() * SHARK_COLORS.length);
    s.p1 = Math.random() * 6.3;
    s.p2 = Math.random() * 6.3;
    return s;
  },

  newSchool(frame, onScreen) {
    const len = FISH_LEN * this.scale;
    const n = Math.max(SCHOOL_MIN, Math.round(frame.w * frame.h / SCHOOL_AREA));
    const spread = len * Math.sqrt(n);
    const lead = this.animal(frame, len, FISH_WIDTH, FISH_SPINE, FISH_AMP, len * FISH_SPEED, spread + len, onScreen);
    const school = { a: lead.a, p1: Math.random() * 6.3, fx: 0, fy: 0, fish: [] };
    for (let i = 0; i < n; i++) {
      const dx = (Math.random() * 2 - 1) * spread, dy = (Math.random() * 2 - 1) * spread;
      const fl = len * this.rand(FISH_SIZES);
      const f = this.animal(frame, fl, FISH_WIDTH, FISH_SPINE, FISH_AMP, fl * FISH_SPEED * (0.8 + 0.4 * Math.random()), 0);
      f.space = this.rand(SCHOOL_SPACE);
      f.clock = 0;
      f.weave = 0.5 + 1.5 * Math.random();   // Hz of this fish's weaving
      f.weavePhase = Math.random() * 6.3;
      f.dart = 0;
      f.dartA = 0;
      f.a = lead.a;
      f.x = lead.x + dx;
      f.y = lead.y + dy;
      for (let j = 0; j < f.joints.length; j += 2) {
        f.joints[j] = f.x - Math.cos(f.a) * f.seg * j / 2;
        f.joints[j + 1] = f.y - Math.sin(f.a) * f.seg * j / 2;
      }
      f.vx = Math.cos(f.a) * f.cruise;
      f.vy = Math.sin(f.a) * f.cruise;
      school.fish.push(f);
    }
    return school;
  },

  // Boids: keep up with the school, keep some space, follow its heading, flee sharks.
  steer(f, school, frame, dt) {
    const reach = SCHOOL_REACH * f.len, space = f.space * f.len;
    let n = 0, cx = 0, cy = 0, vx = 0, vy = 0, sx = 0, sy = 0;
    for (const o of school.fish) {
      if (o === f) continue;
      const dx = o.x - f.x, dy = o.y - f.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > reach * reach) continue;
      n++; cx += dx; cy += dy; vx += o.vx; vy += o.vy;
      if (d2 < space * space && d2 > 0) { const d = Math.sqrt(d2); sx -= dx / d * (1 - d / space); sy -= dy / d * (1 - d / space); }
    }
    let ax = Math.cos(school.a) * f.cruise - f.vx;
    let ay = Math.sin(school.a) * f.cruise - f.vy;
    if (n) {
      ax += cx / n * 0.4 + (vx / n - f.vx) * 0.6;
      ay += cy / n * 0.4 + (vy / n - f.vy) * 0.6;
    } else {
      // Lost sight of the others: head back to the middle of the school.
      const dx = school.mx - f.x, dy = school.my - f.y, d = Math.hypot(dx, dy) || 1;
      ax += dx / d * f.cruise * 3;
      ay += dy / d * f.cruise * 3;
    }
    ax += sx * f.cruise * 4;
    ay += sy * f.cruise * 4;

    // Close to an edge, a fish turns back in by itself, so parts of the school don't drift off.
    const ex = frame.w * SCHOOL_MARGIN / 2, ey = frame.h * SCHOOL_MARGIN / 2;
    if (f.x < ex) ax += f.cruise * 3; else if (f.x > frame.w - ex) ax -= f.cruise * 3;
    if (f.y < ey) ay += f.cruise * 3; else if (f.y > frame.h - ey) ay -= f.cruise * 3;

    // Each fish weaves a little on its own rhythm, and now and then darts off for a moment.
    f.clock += dt;
    const v0 = Math.hypot(f.vx, f.vy) || 1;
    const weave = Math.sin(f.clock * f.weave * 2 * Math.PI + f.weavePhase) * FISH_WANDER * f.cruise;
    ax -= f.vy / v0 * weave;
    ay += f.vx / v0 * weave;
    if (f.dart > 0) {
      f.dart -= dt;
      ax += Math.cos(f.dartA) * f.cruise * FISH_DART_PUSH;
      ay += Math.sin(f.dartA) * f.cruise * FISH_DART_PUSH;
    } else if (Math.random() < FISH_DART_RATE * dt) {
      f.dart = FISH_DART_TIME;
      f.dartA = f.a + (Math.random() - 0.5) * 2;
    }

    let fear = 0;
    for (const s of this.sharks) {
      const r = FISH_FEAR * s.len;
      for (let j = 0; j < s.joints.length; j += 4) {
        const dx = f.x - s.joints[j], dy = f.y - s.joints[j + 1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= r || d === 0) continue;
        const k = 1 - d / r;
        fear = Math.max(fear, k);
        school.fx += dx / d * k;
        school.fy += dy / d * k;
        ax += dx / d * k * f.cruise * 20;
        ay += dy / d * k * f.cruise * 20;
      }
    }

    f.vx += ax * dt;
    f.vy += ay * dt;
    const v = Math.hypot(f.vx, f.vy);
    const top = f.cruise * (f.dart > 0 ? 2.5 : 1.3) + (f.len * FISH_FLEE - f.cruise * 1.3) * Math.min(1, fear * 2);
    const speed = Math.min(top, Math.max(f.cruise * 0.5, v));
    if (v > 0) { f.vx *= speed / v; f.vy *= speed / v; }
    f.a = Math.atan2(f.vy, f.vx);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.phase += 2 * Math.PI * FISH_BEAT * (speed / f.cruise) * dt;
  },

  // Pull the joints after the head; note entering and leaving the screen.
  move(b, frame, dt) {
    const j = b.joints;
    j[0] = b.x;
    j[1] = b.y;
    for (let i = 2; i < j.length; i += 2) {
      const dx = j[i] - j[i - 2], dy = j[i + 1] - j[i - 1];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      j[i] = j[i - 2] + dx / d * b.seg;
      j[i + 1] = j[i - 1] + dy / d * b.seg;
    }
    b.age += dt;
    const m = b.len * 0.2;
    if (b.x >= 0 && b.y >= 0 && b.x < frame.w && b.y < frame.h) b.entered = true;
    else if (!b.entered) { b.done = b.age > SWIM_GIVE_UP; return; }
    let out = true;
    for (let i = 0; i < j.length && out; i += 2) out = j[i] < -m || j[i] > frame.w + m || j[i + 1] < -m || j[i + 1] > frame.h + m;
    b.done = out;
  },

  // Joints with the swimming wave applied, and the forward direction at each.
  posed(b) {
    const j = b.joints, p = this.pose, d = this.dirs, n = j.length / 2;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), z = Math.min(n - 1, i + 1);
      let fx = j[2 * a] - j[2 * z], fy = j[2 * a + 1] - j[2 * z + 1];
      const l = Math.sqrt(fx * fx + fy * fy) || 1;
      fx /= l; fy /= l;
      const off = this.wave(b, i / (n - 1));
      p[2 * i] = j[2 * i] - fy * off;
      p[2 * i + 1] = j[2 * i + 1] + fx * off;
      d[2 * i] = fx;
      d[2 * i + 1] = fy;
    }
  },

  // Sideways offset of the spine at s (0 = head, 1 = last joint).
  wave(b, s) {
    return b.len * b.amp * (0.2 + 0.8 * s * s) * Math.sin(b.phase - s * SWIM_WAVE);
  },

  sharkShape(b) {
    const L = b.len, p = this.pose, d = this.dirs, n = b.widths.length;
    this.ncaps = 0;
    this.spine(b);
    // Hammer: a wide crossbar at the front, its tips swept back a little.
    const fx = d[0], fy = d[1];
    const hx = p[0] + fx * 0.01 * L, hy = p[1] + fy * 0.01 * L;
    for (let side = -1; side <= 1; side += 2) {
      this.capsule(hx, hy, 0.045 * L, hx - fy * side * 0.15 * L - fx * 0.035 * L, hy + fx * side * 0.15 * L - fy * 0.035 * L, 0.032 * L);
    }
    // Pectoral fins, swept back.
    this.fins(p[4], p[5], d[4], d[5], 0.05 * L, 0.18 * L, 0.11 * L, 0.03 * L, 0.008 * L);
    // Pelvic fins, small.
    this.fins(p[12], p[13], d[12], d[13], 0.02 * L, 0.06 * L, 0.05 * L, 0.012 * L, 0.005 * L);
    // Tail: long upper lobe continuing the spine and the wave.
    this.tail(b, n, 0.27 * L, 0, 0.016 * L, 0.005 * L);
  },

  fishShape(b) {
    this.ncaps = 0;
    this.spine(b);
  },

  spine(b) {
    const p = this.pose, w = b.widths;
    for (let i = 0; i + 1 < w.length; i++) {
      this.capsule(p[2 * i], p[2 * i + 1], w[i] * b.len, p[2 * i + 2], p[2 * i + 3], w[i + 1] * b.len);
    }
  },

  // A pair of fins at a joint: base out from the spine, tip out and back.
  fins(x, y, fx, fy, base, out, back, r0, r1) {
    for (let side = -1; side <= 1; side += 2) {
      const px = -fy * side, py = fx * side;
      this.capsule(x + px * base, y + py * base, r0, x + px * out - fx * back, y + py * out - fy * back, r1);
    }
  },

  // A tail lobe from the last joint, length back, spread sideways, bent further by the wave.
  tail(b, n, back, spread, r0, r1) {
    const p = this.pose, d = this.dirs, i = n - 1;
    const fx = d[2 * i], fy = d[2 * i + 1];
    const side = spread + this.wave(b, 1 + back / (b.seg * i)) - this.wave(b, 1);
    this.capsule(p[2 * i], p[2 * i + 1], r0, p[2 * i] - fx * back - fy * side, p[2 * i + 1] - fy * back + fx * side, r1);
  },

  capsule(ax, ay, ar, bx, by, br) {
    const c = this.caps, k = 6 * this.ncaps++;
    c[k] = ax; c[k + 1] = ay; c[k + 2] = Math.max(SWIM_MIN_RADIUS, ar);
    c[k + 3] = bx; c[k + 4] = by; c[k + 5] = Math.max(SWIM_MIN_RADIUS, br);
  },

  // Fill the capsules: dithered dots inside, from `edge` density at the edge to full deep inside.
  // Each cell gets the shade of its deepest dot, from shades[0] (sides) to the last (back).
  raster(frame, shades, edge) {
    const { w, h, cols, dots, ink } = frame;
    const c = this.caps, shade = this.shade, level = this.level;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, deep = 0;
    for (let k = 0; k < 6 * this.ncaps; k += 3) {
      x0 = Math.min(x0, c[k] - c[k + 2]); x1 = Math.max(x1, c[k] + c[k + 2]);
      y0 = Math.min(y0, c[k + 1] - c[k + 2]); y1 = Math.max(y1, c[k + 1] + c[k + 2]);
      deep = Math.max(deep, c[k + 2]);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(w - 1, Math.ceil(x1)); y1 = Math.min(h - 1, Math.ceil(y1));
    if (x0 > x1 || y0 > y1) return;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    shade.fill(1, 0, bw * bh);
    for (let r = y0 >> 2; r <= y1 >> 2; r++) level.fill(-1, r * cols + (x0 >> 1), r * cols + (x1 >> 1) + 1);

    for (let k = 0; k < 6 * this.ncaps; k += 6) {
      const ax = c[k], ay = c[k + 1], ar = c[k + 2], dx = c[k + 3] - ax, dy = c[k + 4] - ay, dr = c[k + 5] - ar;
      const l2 = dx * dx + dy * dy || 1;
      const r = Math.max(ar, c[k + 5]);
      const cx0 = Math.max(x0, Math.floor(Math.min(ax, ax + dx) - r)), cx1 = Math.min(x1, Math.ceil(Math.max(ax, ax + dx) + r));
      const cy0 = Math.max(y0, Math.floor(Math.min(ay, ay + dy) - r)), cy1 = Math.min(y1, Math.ceil(Math.max(ay, ay + dy) + r));
      for (let y = cy0; y <= cy1; y++) {
        for (let x = cx0; x <= cx1; x++) {
          const px = x - ax, py = y - ay;
          const t = Math.min(1, Math.max(0, (px * dx + py * dy) / l2));
          const qx = px - dx * t, qy = py - dy * t;
          const v = Math.sqrt(qx * qx + qy * qy) - ar - dr * t;
          const i = (y - y0) * bw + x - x0;
          if (v < shade[i]) shade[i] = v;
        }
      }
    }

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y - y0) * bw + x - x0;
        const v = shade[i];
        if (v < 0) {
          const dense = edge + (SWIM_DENSE_CORE - edge) * Math.min(1, -v / SWIM_CORE);
          dots[y * w + x] = dense > this.grain[y * w + x] ? 1 : 0;
          const cell = (y >> 2) * cols + (x >> 1);
          const l = Math.max(0, Math.min(SWIM_SHADES - 1, Math.floor(-v / deep * SWIM_SHADES + this.jitter[cell])));
          if (l > level[cell]) { level[cell] = l; ink[cell] = shades[l]; }
        }
      }
    }
  },

  // Ink indexes for SWIM_SHADES shades of a CSS color variable, from darker to lighter.
  shades(frame, name) {
    const css = getComputedStyle(document.documentElement);
    const hex = v => css.getPropertyValue(v).trim().match(/\w\w/g).map(n => parseInt(n, 16));
    const base = hex(name), dark = hex('--shade-dark'), light = hex('--bg');
    const out = [];
    for (let i = 0; i < SWIM_SHADES; i++) {
      const m = -SWIM_DARKEN + (SWIM_DARKEN + SWIM_LIGHTEN) * i / (SWIM_SHADES - 1);
      const to = m < 0 ? dark : light;
      const rgb = base.map((b, j) => Math.round(b + (to[j] - b) * Math.abs(m)));
      out.push(frame.color('#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('')));
    }
    return out;
  },

  // Random number in [min, max).
  rand([min, max]) { return min + Math.random() * (max - min); },
};
