// Water layer, drawn last: the surface seen from above. Specks, single dots, drift with slow
// currents that swirl differently from place to place and slowly change shape, which gives the
// water its form. They only show inside patches that slowly form and fade, unevenly spread. Ripples (frame.ripple) shift what's under the surface (refraction) and light up
// as twinkling dots where they are steep.
const WATER_SPECKS = 1 / 70;   // specks per dot² of screen
const WATER_FLOW = 5;          // dots/s, typical current speed
const WATER_CURRENT = 45;      // dots, size of a current's swirl
const WATER_CHANGE = 0.05;     // rad/s, how fast the currents change shape
const WATER_LIFE = [4, 12];    // s a speck lives before it reappears somewhere else
const WATER_PATCH = 40;        // dots, size of the patches specks show in
const WATER_PATCHY = 0.17;     // how far above the screen's average a spot must be to show specks; higher = fewer
const WATER_PATCH_SOFT = 0.06; // spread of the cutoff between specks, so patch edges are soft
const WATER_PATCH_CHANGE = 0.03; // rad/s, how fast the patches form and fade
const WATER_GLINT = 0.35;      // ripple steepness above which it starts to glint
const WATER_DENSITY = 0.25;    // share of time a dot is lit at the strongest glint
const WATER_TWINKLE = [0.4, 1.6]; // Hz, range of each dot's own twinkle rate
const WATER_RIPPLE = 4;        // glint per unit of ripple steepness (height difference across 2 dots)
const WATER_BEND = 6;          // dots of refraction shift per unit of ripple height difference
const WATER_NOISE_N = 64;      // side of the noise grids the currents come from; they wrap

const Water = {
  sx: null, sy: null,        // Float32Array per speck: position in dots
  life: null,                // Float32Array per speck: s left before it reappears elsewhere
  cut: null,                 // Float32Array per speck: its own patch cutoff
  patch: null,               // Float32Array per speck: scratch, patch value under it this frame
  noiseA: null, noiseB: null, // Float32Array(N * N), two random fields the currents blend between
  noiseC: null, noiseD: null, // Float32Array(N * N), two random fields the patches blend between
  phase: null,               // Float32Array(w * h), per-dot twinkle phase 0..1
  rate: null,                // Float32Array(w * h), per-dot twinkle rate, Hz
  t: 0,                      // s, current time
  below: null,               // Uint8Array(w * h), copy of what was drawn under the water

  resize(frame) {
    const { w, h } = frame;
    const n = Math.round(w * h * WATER_SPECKS);
    this.sx = new Float32Array(n);
    this.sy = new Float32Array(n);
    this.life = new Float32Array(n);
    this.cut = new Float32Array(n).map(() => WATER_PATCHY + (Math.random() - 0.5) * WATER_PATCH_SOFT);
    this.patch = new Float32Array(n);
    for (let i = 0; i < n; i++) this.respawn(frame, i);
    this.noiseA = new Float32Array(WATER_NOISE_N * WATER_NOISE_N).map(Math.random);
    this.noiseB = new Float32Array(WATER_NOISE_N * WATER_NOISE_N).map(Math.random);
    this.noiseC = new Float32Array(WATER_NOISE_N * WATER_NOISE_N).map(Math.random);
    this.noiseD = new Float32Array(WATER_NOISE_N * WATER_NOISE_N).map(Math.random);
    this.phase = new Float32Array(w * h);
    this.rate = new Float32Array(w * h);
    const [r0, r1] = WATER_TWINKLE;
    for (let i = 0; i < w * h; i++) {
      this.phase[i] = Math.random();
      this.rate[i] = r0 + Math.random() * (r1 - r0);
    }
    this.below = new Uint8Array(w * h);
  },

  respawn(frame, i) {
    const [l0, l1] = WATER_LIFE;
    this.sx[i] = Math.random() * frame.w;
    this.sy[i] = Math.random() * frame.h;
    this.life[i] = l0 + Math.random() * (l1 - l0);
  },

  // Each speck follows the curl of a smooth potential, so currents swirl without bunching specks up.
  // The potential blends two fixed noise fields with weights that turn over time: it changes shape
  // in place instead of sliding in one direction.
  update(frame, dt, t) {
    this.t = t;
    const { sx, sy, life } = this;
    const ca = Math.cos(t * WATER_CHANGE), sa = Math.sin(t * WATER_CHANGE);
    const pot = (u, v) => ca * this.smooth(this.noiseA, u, v) + sa * this.smooth(this.noiseB, u, v);
    const e = 0.25, k = WATER_FLOW / (2 * e) * dt;
    for (let i = 0; i < sx.length; i++) {
      const u = sx[i] / WATER_CURRENT, v = sy[i] / WATER_CURRENT;
      sx[i] += (pot(u, v + e) - pot(u, v - e)) * k;
      sy[i] -= (pot(u + e, v) - pot(u - e, v)) * k;
      life[i] -= dt;
      if (life[i] <= 0 || sx[i] < 0 || sy[i] < 0 || sx[i] >= frame.w || sy[i] >= frame.h) this.respawn(frame, i);
    }
  },

  // Value noise at (u, v) in grid units, smoothly interpolated, wrapping around the grid.
  smooth(n, u, v) {
    const N = WATER_NOISE_N;
    const x0 = Math.floor(u), y0 = Math.floor(v);
    let fx = u - x0, fy = v - y0;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const xa = ((x0 % N) + N) % N, xb = (xa + 1) % N;
    const ya = ((y0 % N) + N) % N * N, yb = (ya + N) % (N * N);
    const a = n[ya + xa] + (n[ya + xb] - n[ya + xa]) * fx;
    const b = n[yb + xa] + (n[yb + xb] - n[yb + xa]) * fx;
    return a + (b - a) * fy;
  },

  draw(frame) {
    const { w, h, dots, ripple } = frame;
    if (!frame.rippleCalm) {
      const { phase, rate, t, below } = this;
      below.set(dots);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1, i = y * w + 1; x < w - 1; x++, i++) {
          const gx = ripple[i + 1] - ripple[i - 1], gy = ripple[i + w] - ripple[i - w];
          const slope = (Math.abs(gx) + Math.abs(gy)) * WATER_RIPPLE;
          const sx = Math.round(gx * WATER_BEND), sy = Math.round(gy * WATER_BEND);
          const j = x + sx >= 0 && x + sx < w && y + sy >= 0 && y + sy < h ? i + sy * w + sx : i;
          const tw = t * rate[i] + phase[i];
          dots[i] = below[j] || tw - Math.floor(tw) < (slope - WATER_GLINT) / (1 - WATER_GLINT) * WATER_DENSITY ? 1 : 0;
        }
      }
    }
    // Patches the same way as the currents: two fields blended with turning weights. Measured
    // against this frame's average, so about the same share of specks shows at any time.
    const { sx, sy, cut, patch, noiseC, noiseD } = this;
    const ca = Math.cos(this.t * WATER_PATCH_CHANGE), sa = Math.sin(this.t * WATER_PATCH_CHANGE);
    let mean = 0;
    for (let i = 0; i < sx.length; i++) {
      const u = sx[i] / WATER_PATCH, v = sy[i] / WATER_PATCH;
      mean += patch[i] = ca * this.smooth(noiseC, u, v) + sa * this.smooth(noiseD, u, v);
    }
    mean /= sx.length;
    for (let i = 0; i < sx.length; i++) {
      if (patch[i] - mean > cut[i]) dots[(sy[i] | 0) * w + (sx[i] | 0)] = 1;
    }
  },
};
