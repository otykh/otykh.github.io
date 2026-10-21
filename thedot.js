// The Dot card: full width, framed in braille and split in two. One section holds the title as
// large lettering drawn in braille (pre-rendered in dot-title.js from the game's narrow sans) in
// dark dots, with the year in pale text set into the frame's bottom line at the left (into the split when stacked); the other holds the description, whose opening
// "The Dot" is followed by a link icon. Wide screens put the sections side by side with a split
// between them; narrow ones stack them with a split across. The title's dots are soft like jelly:
// they lean away from the mouse and spring back when it leaves; a tap pushes them out with a bounce.
const DOT_PAD = [3, 2];        // cells between the frame or split and the contents: columns, rows
const DOT_LINK = '↪︎'; // hooked arrow after "The Dot" in the description, linking to the game
const DOT_MARK = '↪';     // stands in for the link icon while wrapping (one character wide)
const DOT_JELLY = { reach: 30, push: 4, spring: 70, damping: 7, tap: 60 }; // dots of reach, dots pushed at the
                               // pointer, spring stiffness and damping (lower = bouncier), tap kick (dots/s)
const DOT_TEXT_MIN = 40;       // narrowest the description may get beside the one-line title; below it the
                               // title is drawn as "The" over "Dot" (dot-title-stacked.js)

CARD_DESIGNS.thedot = {
  layout(c) {
    const [px, py] = DOT_PAD, { cols, stacked } = c;
    const [title, year, description] = c.fields.map(f => f[1]);
    const text = description.replace(title, `${title} ${DOT_MARK}`);
    c.year = year;
    if (stacked) {
      // The biggest title that fits with a blank cell between it and the frame on each side.
      c.art = DOT_TITLE.find(a => a.cols <= cols - 4) || DOT_TITLE.at(-1);
      const a = c.art;
      c.ac = Math.floor((cols - a.cols) / 2);
      // The title centred in its section, with as much space above it as below; the year sits
      // in the split under it.
      const gap = 2;
      c.ar = 1 + gap;
      c.split = { row: c.ar + a.rows + gap };
      c.yc = Math.floor((cols - year.length) / 2);
      c.tc = px;
      c.lines = Cards.wrap(text, cols - 2 * px).map((t, i) => ({ text: t, row: c.split.row + py + i }));
      return c.lines.at(-1).row + 1 + py;
    }
    // Side by side: the title's section is as wide as the title plus padding. If that leaves the
    // description too narrow, the title goes on two lines.
    const room = art => cols - 1 - px - (art.cols + 2 * px + 2 + px);
    c.art = room(DOT_TITLE[0]) >= DOT_TEXT_MIN ? DOT_TITLE[0] : DOT_TITLE_STACKED[0];
    const a = c.art, sc = a.cols + 2 * px + 1;
    c.split = { col: sc };
    c.tc = sc + 1 + px;
    const lines = Cards.wrap(text, cols - 1 - px - c.tc);
    // The title centred in its section; the year goes in the section's bottom left corner.
    const rows = Math.max(a.rows + 2, lines.length);
    c.ac = 1 + px;
    // When the description runs much taller than the title (narrow screens such as a phone held
    // sideways), the title stays at the top instead.
    c.ar = lines.length > 2 * (a.rows + 2) ? py : py + Math.floor((rows - a.rows) / 2);
    const tr = py + Math.floor((rows - lines.length) / 2);
    c.lines = lines.map((t, i) => ({ text: t, row: tr + i }));
    return py + rows + py;
  },

  draw(c) {
    const { cols, rows, art: a, split } = c, W = cols * 2, H = rows * 4, frame = new Uint8Array(W * H);
    // The frame along the outer dots, and the split line through the middle of its cell.
    // Side by side, the bottom line is broken near its left end by the year, a blank cell either side.
    const yb0 = split.col ? 2 * 2 : -1, yb1 = split.col ? (3 + c.year.length + 1) * 2 : -1;
    for (let x = 0; x < W; x++) {
      frame[x] = 1;
      if (x < yb0 || x >= yb1) frame[(H - 1) * W + x] = 1;
    }
    for (let y = 0; y < H; y++) frame[y * W] = frame[y * W + W - 1] = 1;
    if (split.col) for (let y = 0; y < H; y++) frame[y * W + split.col * 2] = 1;
    else {
      // Across the split, broken by the year with a blank cell on each side.
      const y0 = (c.yc - 1) * 2, y1 = (c.yc + c.year.length + 1) * 2;
      for (let x = 0; x < W; x++) if (x < y0 || x >= y1) frame[(split.row * 4 + 1) * W + x] = 1;
    }
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const ch = Cards.cell(frame, W, col, r);
        if (ch !== '⠀') Cards.text(c, ch, col, r, '--secondary');
      }
    }

    // The title's dots, each with a resting place, an offset and a velocity for the jelly.
    const x0 = c.ac * 2, y0 = c.ar * 4, dots = [];
    a.lines.forEach((line, r) => [...line].forEach((ch, col) => {
      const bits = ch.charCodeAt(0) - 0x2800;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) {
        if (bits & DOT_BIT[dy][dx]) dots.push({ x: x0 + col * 2 + dx, y: y0 + r * 4 + dy, ox: 0, oy: 0, vx: 0, vy: 0 });
      }
    }));
    c.jelly = { dots, moving: false, last: null, kick: null };
    // The section the title can move in: inside the frame, up to the split.
    c.area = split.col ? { c0: 1, r0: 1, c1: split.col - 1, r1: rows - 2 } : { c0: 1, r0: 1, c1: cols - 2, r1: split.row - 1 };
    this.drawTitle(c);
    if (!split.col) Cards.text(c, c.year, c.yc, split.row, '--secondary');
    this.listen(c);

    // The description, with the link icon drawn in link color where the marker is.
    for (const l of c.lines) {
      const at = l.text.indexOf(DOT_MARK);
      if (at < 0) { Cards.text(c, l.text, c.tc, l.row, '--main'); continue; }
      Cards.text(c, l.text.slice(0, at), c.tc, l.row, '--main');
      Cards.text(c, DOT_LINK, c.tc + at, l.row, '--link');
      Cards.text(c, l.text.slice(at + 1), c.tc + at + 1, l.row, '--main');
      c.cellLinks.push([c.tc + at, l.row, 1, 'The Dot on Steam']);
    }
  },

  // Clears the title's section and draws the title's dots where they are now (and the year, which
  // shares the section on wide screens).
  drawTitle(c) {
    const { area: A, cols } = c, W = (A.c1 - A.c0 + 1) * 2, H = (A.r1 - A.r0 + 1) * 4, buf = new Uint8Array(W * H);
    for (const d of c.jelly.dots) {
      const x = Math.round(d.x + d.ox) - A.c0 * 2, y = Math.round(d.y + d.oy) - A.r0 * 4;
      if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = 1;
    }
    Cards.clear(c, A.c0, A.r0, A.c1 - A.c0 + 1, A.r1 - A.r0 + 1);
    for (let r = 0; r < H / 4; r++) {
      for (let col = 0; col < W / 2; col++) {
        const ch = Cards.cell(buf, W, col, r);
        if (ch !== '\u2800') Cards.text(c, ch, A.c0 + col, A.r0 + r, '--heavy');
      }
    }
    if (c.split.col) Cards.text(c, c.year, 3, c.rows - 1, '--secondary');
  },

  // The pointer, in the card's dots: a mouse anywhere over the page, or a tap (which kicks).
  listen(c) {
    if (c.jellyListening) return;
    c.jellyListening = true;
    const at = e => {
      const r = c.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / c.cellW * 2, y: (e.clientY - r.top) / c.cellH * 4 };
    };
    window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') c.pointer = at(e); });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) c.pointer = null; });
    window.addEventListener('blur', () => { c.pointer = null; });
    window.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') c.jelly.kick = at(e); });
  },

  // Each dot springs toward where the pointer pushes it (or back to rest), and only redraws while
  // something moves.
  tick(c, t) {
    const j = c.jelly;
    if (!j) return;
    const dt = j.last === null ? 0 : Math.min(t - j.last, 0.05);
    j.last = t;
    const { reach, push, spring, damping, tap } = DOT_JELLY, p = c.pointer, kick = j.kick;
    j.kick = null;
    if (!p && !kick && !j.moving) return;
    let moving = false;
    for (const d of j.dots) {
      let tx = 0, ty = 0;
      if (p) {
        const dx = d.x - p.x, dy = d.y - p.y, dist = Math.hypot(dx, dy);
        // A smooth falloff, so the push fades gently toward the edge of its reach.
        if (dist < reach && dist > 0) { const u = 1 - dist / reach, f = u * u * (3 - 2 * u) * push; tx = dx / dist * f; ty = dy / dist * f; }
      }
      if (kick) {
        const dx = d.x - kick.x, dy = d.y - kick.y, dist = Math.hypot(dx, dy);
        if (dist < reach * 1.5 && dist > 0) { const f = (1 - dist / (reach * 1.5)) * tap; d.vx += dx / dist * f; d.vy += dy / dist * f; }
      }
      d.vx += ((tx - d.ox) * spring - d.vx * damping) * dt;
      d.vy += ((ty - d.oy) * spring - d.vy * damping) * dt;
      d.ox += d.vx * dt;
      d.oy += d.vy * dt;
      if (Math.abs(d.vx) + Math.abs(d.vy) > 0.05 || Math.abs(d.ox - tx) + Math.abs(d.oy - ty) > 0.05) moving = true;
    }
    if (!moving && !j.moving) return;
    j.moving = moving;
    this.drawTitle(c);
  },
};
