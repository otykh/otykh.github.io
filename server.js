// Server Is Down card (2020): a dark panel, in both themes. At its left, a little in, the card's
// text in green, glowing; behind it, on every row, a slow stream of very dark green characters:
// runs of 1s and 0s and words, in random order, each row shifting left one character at a time at
// its own pace, with a few rows of it above and below the text and running right up to each of its
// lines' ends. Clicking the stream sets off snakes of corrupt red Chinese characters there,
// spreading out all round: each heads for the card's edge in its own, slowly drifting direction, in
// a staircase of sharp turns (a few cells across, a few up or down), its characters swapping and
// its trail fading behind it, until it has crawled off the card.
const SID_LINK = '\u21AA\uFE0E'; // hooked arrow after the title, linking to the game
const SID_TEXT = 44;             // most columns of text
const SID_LEFT = 2;              // columns of stream left of the text
const SID_ROWS = 2;              // rows of stream above and below the text
const SID_GLOW = 8;              // px the text's glow blurs out by
const SID_SPEED = [1.5, 3];      // least and most characters a second a row shifts by
const SID_WORDS = ['videogame', 'computer', ':)', '^_^', 'o7', 'ascii', 'hello', 'goodbye', '$$$', 'displays',
  'ok', 'happier', 'fitter', 'more', 'productive', 'morning', 'evening', 'pointer'];
const SID_BITS = [4, 16];        // least and most digits in a run of 1s and 0s
// The snakes' characters: 错误 error, 崩溃 crash, 故障 fault, 乱码 garbled text, 死机 frozen
// machine, 失败 failure, 删除 delete, 断 broken off, 坏 broken, 无 none.
const SID_CORRUPT = '错误崩溃故障乱码死机失败删除断坏无';
const SID_SNAKES = [6, 8];       // least and most snakes a click sets off, spread evenly round a circle
const SID_CRAWL = [14, 22];      // least and most cells a second a snake crawls
const SID_TRAIL = [6, 12];       // least and most cells long a snake's trail is
const SID_RUN = [1, 4];          // least and most cells a snake goes one way before turning
const SID_WANDER = 0.25;         // most radians a snake's heading drifts by at each step
const SID_FLICKER = 15;          // times a second a trail's characters swap

CARD_DESIGNS.server = {
  layout(c) {
    const field = name => c.fields.find(f => f[0] === name)?.[1] ?? '';
    const cols = c.cols, col = SID_LEFT;
    const tw = Math.min(SID_TEXT, cols - 2 * col);
    const lines = [field('Title'), `License: ${field('Year')}`, '', ...Cards.wrap(field('Description'), tw)];
    c.lines = lines.map((text, i) => ({ text, color: '--sid-text', col, row: SID_ROWS + i })).filter(l => l.text);
    // The arrow after the title; the cell between them is kept clear of the stream.
    c.lines.splice(1, 0, { text: SID_LINK, color: '--link', col: col + lines[0].length + 1, row: SID_ROWS });
    c.gap = [col + lines[0].length, SID_ROWS];
    return lines.length + 2 * SID_ROWS;
  },

  draw(c) {
    const { cols, rows } = c;
    // Which cells the stream may use: all but the text's.
    const text = new Set();
    for (const l of c.lines) for (let i = 0; i < l.text.length; i++) text.add(l.row * cols + l.col + i);
    text.add(c.gap[1] * cols + c.gap[0]);
    c.free = (col, r) => !text.has(r * cols + col);
    // Each row: its text (longer than the card, wrapping round), where it starts, and its pace (a
    // growing shift moves it left).
    c.streams = [];
    for (let r = 0; r < rows; r++) {
      let s = '';
      while (s.length < cols * 3) {
        if (Math.random() < 0.5) {
          const n = SID_BITS[0] + Math.floor(Math.random() * (SID_BITS[1] - SID_BITS[0] + 1));
          for (let i = 0; i < n; i++) s += Math.random() < 0.5 ? '0' : '1';
        } else s += SID_WORDS[Math.floor(Math.random() * SID_WORDS.length)];
        s += ' ';
      }
      const speed = SID_SPEED[0] + Math.random() * (SID_SPEED[1] - SID_SPEED[0]);
      c.streams.push({ s, speed, at: Math.floor(Math.random() * s.length), shown: -1 });
    }
    c.ctx.fillStyle = c.color('--sid-bg');
    c.ctx.fillRect(0, 0, cols * c.cellW, rows * c.cellH);
    c.snakes = [];
    this.glow(c);
    for (let r = 0; r < rows; r++) this.row(c, r, 0);
    // A click on the stream sets off snakes there (the text and the link are on their own layers
    // over the canvas, so clicks on them don't come here).
    if (!c.clicks) {
      c.clicks = true;
      c.canvas.addEventListener('pointerdown', e => {
        const r = c.canvas.getBoundingClientRect(), col = Math.floor((e.clientX - r.left) / c.cellW), row = Math.floor((e.clientY - r.top) / c.cellH);
        if (col >= 0 && row >= 0 && col < c.cols && row < c.rows && c.free(col, row)) this.spawn(c, col, row);
      });
    }
  },

  // Snakes from (col, row), heading out round a circle (each a share of it, at a random angle within
  // its share), each with its own pace and length, their first steps spread out.
  spawn(c, col, row) {
    const rand = ([a, b]) => a + Math.random() * (b - a), n = Math.round(rand(SID_SNAKES)), turn = Math.random() * 2 * Math.PI;
    for (let k = 0; k < n; k++) {
      c.snakes.push({ col, row, a: turn + 2 * Math.PI * (k + Math.random() * 0.9) / n, err: 0, axis: -1, left: 0,
        speed: rand(SID_CRAWL), long: Math.round(rand(SID_TRAIL)), clock: -Math.random() * 0.3, trail: [], out: false });
    }
  },

  // Moves each snake on by the steps its pace allows in dt, toward the edge along its heading, which
  // drifts a little at each step: it goes one way (across, or up or down) for a short run, then
  // turns to whichever way has fallen behind its heading the most, so it zigzags in sharp turns.
  // A heading's sideways and up-and-down parts are in cells: a cell is about twice as tall as it is
  // wide, so up and down count double. Its trail keeps its last cells, each with a random character
  // (swapped now and then, see tick). A snake whose head is off the card and whose trail has
  // followed it out is dropped. Returns the rows it touched.
  crawl(c, dt) {
    const rows = new Set(), [r0, r1] = SID_RUN;
    for (const s of c.snakes) {
      s.clock += dt * s.speed;
      for (; s.clock >= 1; s.clock--) {
        if (!s.out) {
          s.a += (Math.random() * 2 - 1) * SID_WANDER;
          s.dx = Math.cos(s.a);
          s.dy = Math.sin(s.a) / 2;
          // err: how far ahead across (+) or up and down (-) it is of its heading, in heading steps.
          if (s.left <= 0) {
            const ax = Math.abs(s.dx), ay = Math.abs(s.dy);
            s.axis = ay < 0.05 ? 0 : ax < 0.05 ? 1 : s.err > 0 ? 1 : 0;
            const share = s.axis ? ay / (ax + ay) : ax / (ax + ay);
            s.left = Math.max(1, Math.round((r0 + Math.random() * (r1 - r0)) * share * 2));
          }
          s.left--;
          const ax = Math.abs(s.dx), ay = Math.abs(s.dy);
          if (s.axis === 0) { s.col += Math.sign(s.dx); s.err += ay / (ax + ay); }
          else { s.row += Math.sign(s.dy); s.err -= ax / (ax + ay); }
          s.out = s.col < 0 || s.col >= c.cols || s.row < 0 || s.row >= c.rows;
          if (!s.out) s.trail.unshift([s.col, s.row, SID_CORRUPT[Math.floor(Math.random() * SID_CORRUPT.length)]]);
        }
        const gone = s.out ? s.trail.splice(-1, 1) : s.trail.splice(s.long);
        for (const [, r] of [...gone, ...s.trail]) rows.add(r);
      }
    }
    c.snakes = c.snakes.filter(s => !s.out || s.trail.length);
    return rows;
  },

  // The text, glowing: drawn once with a blur of its color behind it, then crisp on top. Its cells
  // never change, so this is done once per layout.
  glow(c) {
    const ctx = c.ctx, color = c.color('--sid-text');
    // The blurred pass straight on the canvas, so the selectable copy gets the text only once.
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = SID_GLOW;
    ctx.fillStyle = color;
    for (const l of c.lines) if (l.color === '--sid-text') [...l.text].forEach((ch, i) => ctx.fillText(ch, (l.col + i + 0.5) * c.cellW, (l.row + 0.5) * c.cellH));
    ctx.restore();
    for (const l of c.lines) Cards.text(c, l.text, l.col, l.row, l.color);
    c.cellLinks.push([c.lines[1].col, c.lines[1].row, 1, `${c.lines[0].text} on Steam`]);
  },

  // Row r of the stream at time t: its free cells cleared to the panel and drawn with the characters
  // its shift has brought there (straight on the canvas, out of the selectable copy). Only redrawn
  // when it has shifted.
  // A snake's trail goes over the stream (not the text), brightest at its head, fading to its tail.
  row(c, r, t, force) {
    const st = c.streams[r], n = st.s.length, shift = Math.floor(st.at + t * st.speed);
    if (shift === st.shown && !force) return;
    st.shown = shift;
    const ctx = c.ctx, bg = c.color('--sid-bg'), color = c.color('--sid-stream');
    const over = new Map();
    for (const s of c.snakes) s.trail.forEach(([col, row, ch], i) => { if (row === r && !over.has(col)) over.set(col, [ch, i / s.long]); });
    const hot = c.color('--sid-corrupt');
    for (let col = 0; col < c.cols; col++) {
      if (!c.free(col, r)) continue;
      ctx.fillStyle = bg;
      ctx.fillRect(col * c.cellW, r * c.cellH, c.cellW, c.cellH);
      const snake = over.get(col);
      const ch = snake ? snake[0] : st.s[(((col + shift) % n) + n) % n];
      if (ch === ' ') continue;
      ctx.fillStyle = snake ? Cards.mix(hot, bg, Math.min(1, snake[1]) * 0.8) : color;
      if (!snake) { ctx.fillText(ch, (col + 0.5) * c.cellW, (r + 0.5) * c.cellH); continue; }
      // A Chinese character is about two cells wide: squeezed across to fit its one.
      ctx.save();
      ctx.translate((col + 0.5) * c.cellW, (r + 0.5) * c.cellH);
      ctx.scale(Math.min(1, c.cellW / ctx.measureText(ch).width), 1);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  },

  tick(c, t) {
    const dt = c.tickLast == null ? 0 : Math.min(0.1, t - c.tickLast);
    c.tickLast = t;
    const touched = c.snakes.length ? this.crawl(c, dt) : new Set();
    // The trails' characters swap now and then.
    if (c.snakes.length && t - (c.flickLast ?? -1) >= 1 / SID_FLICKER) {
      c.flickLast = t;
      for (const s of c.snakes) for (const cell of s.trail) { cell[2] = SID_CORRUPT[Math.floor(Math.random() * SID_CORRUPT.length)]; touched.add(cell[1]); }
    }
    for (let r = 0; r < c.rows; r++) this.row(c, r, t, touched.has(r));
  },
};
