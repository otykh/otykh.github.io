// Ripples layer: mouse-driven waves on the water surface, written into frame.ripple.
// A damped 2D wave equation on a coarse grid. The edges absorb waves (Mur boundary), so waves
// leave the screen instead of bouncing back.
const Ripples = {
  SCALE: 2,                  // dots per simulation cell, per axis
  RATE: 40,                  // simulation steps per second (sets wave speed, ~0.7 cells per step)
  DAMPING: 0.985,            // per-step amplitude kept in open water
  MUR: (Math.SQRT1_2 - 1) / (Math.SQRT1_2 + 1), // absorbing edge coefficient for wave speed 1/√2
  PUSH: 0.6,                 // depth of the dent per cell of pointer path
  SIZE: 1.2,                 // cells, width of the dent (smooth, so no grid-sized noise)
  MAX_STAMPS: 40,            // cap on cells stamped per frame (fast flicks)
  CALM_AFTER: 8,             // s without pointer movement after which the surface is reset and skipped

  sw: 0, sh: 0,              // simulation grid size in cells
  cur: null, prev: null,     // heights now and one step ago
  acc: 0,                    // unsimulated time, s
  px: 0, py: 0, had: false,  // last pointer position (cells) and whether it was inside
  idle: 0,                   // s since the pointer last pushed the surface

  resize(frame) {
    const sw = this.sw = Math.ceil(frame.w / this.SCALE) + 1;
    const sh = this.sh = Math.ceil(frame.h / this.SCALE) + 1;
    this.cur = new Float32Array(sw * sh);
    this.prev = new Float32Array(sw * sh);
    this.acc = 0;
    this.had = false;
    this.idle = this.CALM_AFTER;
  },

  update(frame, dt) {
    const p = frame.pointer;
    if (p.moved && p.inside) {
      const x = p.x / this.SCALE, y = p.y / this.SCALE;
      if (this.had) { this.stroke(this.px, this.py, x, y); this.idle = 0; }
      this.px = x; this.py = y;
    }
    this.had = p.inside;

    // Waves have died out: zero everything once, then skip the work until the next push.
    this.idle += dt;
    if (this.idle >= this.CALM_AFTER) {
      if (!frame.rippleCalm) { this.cur.fill(0); this.prev.fill(0); frame.ripple.fill(0); }
      frame.rippleCalm = true;
      return;
    }
    frame.rippleCalm = false;

    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= 1 / this.RATE) { this.acc -= 1 / this.RATE; this.step(); }
    this.sample(frame);
  },

  // Push the surface along the pointer path, one dent per cell travelled. The dent has a raised
  // rim holding the same volume, so no slow hollow is left behind once the rings move away.
  stroke(x0, y0, x1, y1) {
    const { sw, sh, cur, SIZE } = this;
    const r = Math.ceil(SIZE * 3);
    const n = Math.min(Math.ceil(Math.hypot(x1 - x0, y1 - y0)), this.MAX_STAMPS);
    for (let i = 1; i <= n; i++) {
      const cx = x0 + (x1 - x0) * i / n, cy = y0 + (y1 - y0) * i / n;
      const bx = Math.round(cx), by = Math.round(cy);
      for (let y = Math.max(1, by - r); y <= Math.min(sh - 2, by + r); y++) {
        for (let x = Math.max(1, bx - r); x <= Math.min(sw - 2, bx + r); x++) {
          const q = ((x - cx) ** 2 + (y - cy) ** 2) / (2 * SIZE * SIZE);
          cur[y * sw + x] -= this.PUSH * (1 - q) * Math.exp(-q);
        }
      }
    }
  },

  // One wave step: new = avg of 4 neighbours * 2 - previous, damped. Border cells pass waves out
  // (first-order Mur: the border takes the value its inner neighbour had, moved one step outward).
  step() {
    const { sw, sh, cur, prev, DAMPING, MUR } = this;
    const next = prev;
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const i = y * sw + x;
        next[i] = ((cur[i - 1] + cur[i + 1] + cur[i - sw] + cur[i + sw]) * 0.5 - prev[i]) * DAMPING;
      }
    }
    for (let y = 1; y < sh - 1; y++) {
      const l = y * sw, r = l + sw - 1;
      next[l] = cur[l + 1] + MUR * (next[l + 1] - cur[l]);
      next[r] = cur[r - 1] + MUR * (next[r - 1] - cur[r]);
    }
    for (let x = 0; x < sw; x++) {
      const t = x, b = (sh - 1) * sw + x;
      next[t] = cur[t + sw] + MUR * (next[t + sw] - cur[t]);
      next[b] = cur[b - sw] + MUR * (next[b - sw] - cur[b]);
    }
    this.prev = cur;
    this.cur = next;
  },

  // Bilinear upsample into frame.ripple, clamped to -1..1.
  sample(frame) {
    const { w, h, ripple } = frame;
    const { sw, cur, SCALE } = this;
    for (let y = 0; y < h; y++) {
      const fy = y / SCALE, y0 = fy | 0, ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = x / SCALE, x0 = fx | 0, tx = fx - x0;
        const i = y0 * sw + x0;
        const a = cur[i] + (cur[i + 1] - cur[i]) * tx;
        const b = cur[i + sw] + (cur[i + sw + 1] - cur[i + sw]) * tx;
        const v = a + (b - a) * ty;
        ripple[y * w + x] = v > 1 ? 1 : v < -1 ? -1 : v;
      }
    }
  },

  draw(frame) {},
};
