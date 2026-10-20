// ESO card: a page ripped out of a spiral notepad. A torn edge running through the binding's holes
// (along the top on wide screens, down the left side when stacked), a "Patient Employment Info"
// form of label/value fields on ruled lines, the Star of Life turning, a signature box visitors
// can sign by drawing, and a faint note beside it. The star's frames are pre-rendered
// (eso-star.js) so turning it costs nothing but drawing the current frame.
const ESO_SPIN = 4;            // s per full turn of the star
const ESO_SIG = [20, 3];       // signature box size in cells: columns, rows
const ESO_HOLES = 8;           // dots between binding holes along the torn edge
const ESO_X_FADE = 0.4;        // s for the signature's clearing 'x' to fade in
const ESO_HEADER = 'Patient Employment Info';
const ESO_NOTE = '* "Restructuring" as the cause of early leave.';
const ESO_FULL_RULE = 'Description'; // field ruled across the whole form; the others to half the card
// A binding hole: a ring of dots 4 wide and 4 deep, as [along, depth] offsets.
const ESO_HOLE = [[1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]];

CARD_DESIGNS.eso = {
  // The torn edge, made once per page load: per dot along the edge, how deep (0..1) the rip cuts
  // into the edge cells. Slow waves plus a jagged jitter, like ripped paper.
  tear: (() => {
    const out = [], p1 = Math.random() * 6, p2 = Math.random() * 6;
    let jag = 0;
    for (let i = 0; i < 2048; i++) {
      if (Math.random() < 0.35) jag = (Math.random() - 0.5) * 0.35;
      const v = 0.5 + 0.22 * Math.sin(i * 0.11 + p1) + 0.15 * Math.sin(i * 0.37 + p2) + jag;
      out.push(Math.min(1, Math.max(0, v)));
    }
    return out;
  })(),

  layout(c) {
    const { cols, stacked } = c;
    const star = { w: ESO_STAR.cols, h: ESO_STAR.rows };
    const label = 'Signature:', [sw0, sh] = ESO_SIG;
    if (stacked) {
      c.tc = 3;
      c.tw = cols - 2 - c.tc;
      star.r = 1;
      star.c = c.tc + Math.floor((c.tw - star.w) / 2);
      c.hr = star.r + star.h + 1;
    } else {
      c.tc = 2;
      star.r = 2;
      star.c = cols - 2 - star.w;
      c.tw = star.c - 4 - c.tc;
      c.hr = 2;
    }
    c.star = star;

    // Form lines under the header: each field on its own lines, a ruled row under every line.
    c.form = [];
    for (const [l, value] of c.fields) {
      const lines = Cards.wrap(`${l}: ${value}`, c.tw);
      const half = Math.max(...lines.map(line => line.length), Math.floor(c.cols / 2) - c.tc);
      const rule = l === ESO_FULL_RULE ? c.tw : Math.min(c.tw, half);
      lines.forEach((line, i) => c.form.push({ text: line, label: i === 0 ? l.length + 1 : 0, rule }));
    }
    const formEnd = c.hr + 2 + c.form.length * 2;

    // Signature box at the right, under the star when side by side; its label before it and the
    // clearing 'x' after its rule. The note shares the signature's line, or goes under it.
    const end = cols - 4;
    const sw = Math.min(sw0, end - c.tc - label.length - 1);
    // Side by side, the box starts right where the form's rules end, so it can begin on the last
    // rule's row; stacked, it goes under the form.
    const r0 = stacked ? formEnd : Math.max(formEnd - 1, star.r + star.h);
    const old = c.sig;
    c.sig = { label, sw, sh, c0: end - sw, r0, end, W: sw * 2, H: sh * 4 };
    c.sig.dots = old && old.W === c.sig.W ? old.dots : new Uint8Array(c.sig.W * c.sig.H);
    const lc = c.sig.c0 - label.length - 1;
    if (stacked) {
      c.note = Cards.wrap(ESO_NOTE, c.tw);
      c.noteRow = r0 + sh + 1;
      return c.noteRow + c.note.length + 1;
    }
    c.note = Cards.wrap(ESO_NOTE, lc - c.tc - 2);
    c.noteRow = r0 + sh - c.note.length;
    return r0 + sh + 2;
  },

  draw(c) {
    const { tc, sig } = c;
    this.edges(c);

    Cards.text(c, ESO_HEADER, tc, c.hr, '--main');

    // The form: labels in gray, what's filled in in the main color, each line on a ruled row.
    c.form.forEach((line, i) => {
      const row = c.hr + 2 + i * 2;
      Cards.text(c, line.text.slice(0, line.label), tc, row, '--secondary');
      Cards.text(c, line.text.slice(line.label), tc + line.label, row, '--main');
      Cards.text(c, '⠉'.repeat(line.rule), tc, row + 1, '--secondary');
    });

    // Signature: label on the box's last row, the box, a rule under both. The 'x' shows in tick.
    const lc = sig.c0 - sig.label.length - 1;
    Cards.text(c, sig.label, lc, sig.r0 + sig.sh - 1, '--secondary');
    Cards.text(c, '⠉'.repeat(sig.end - lc), lc, sig.r0 + sig.sh, '--secondary');
    this.drawSig(c);
    this.listen(c);
    c.xShown = 0;
    c.xSince = null;

    c.note.forEach((line, i) => Cards.text(c, line, tc, c.noteRow + i, '--faint'));
    c.frame = -1;
  },

  // Page edges. The torn side is drawn into one row (or two columns) of dots: the rip as a jagged
  // line, and the binding's holes as rings it cuts through. Only what is below the rip, on the
  // page's side, is drawn, so the holes are broken open. The other sides are lines.
  edges(c) {
    const { cols, rows, stacked } = c;
    const len = stacked ? rows * 4 : cols * 2;
    const depth = i => Math.round(this.tear[i] * 2);
    const W = stacked ? 4 : len, dots = new Uint8Array(W * (stacked ? len : 4));
    const set = (i, j) => { if (stacked) dots[i * 4 + j] = 1; else dots[j * W + i] = 1; };
    // Position within a hole along the edge (0..3), or outside it. Down the side, holes sit within
    // single rows, since braille rows have gaps between them.
    const along = i => i % ESO_HOLES - (stacked ? 0 : 2);
    const inHole = (i, j) => { const u = along(i); return u >= 1 && u <= 2 && j >= 1 && j <= 2; };
    for (let i = 0; i < len; i++) {
      const a = depth(i), b = i > 0 ? depth(i - 1) : a;
      for (let j = Math.min(a, b); j <= Math.max(a, b); j++) if (!inHole(i, j)) set(i, j);
      for (const [hu, hj] of ESO_HOLE) if (hu === along(i) && hj >= a) set(i, hj);
    }
    for (let j = depth(0); j < 4; j++) set(0, j);
    for (let j = depth(len - 1); j < 4; j++) set(len - 1, j);

    if (!stacked) {
      for (let col = 0; col < cols; col++) Cards.text(c, Cards.cell(dots, W, col, 0), col, 0, '--secondary');
      for (let row = 1; row < rows - 1; row++) {
        Cards.text(c, '⡇', 0, row, '--secondary');
        Cards.text(c, '⢸', cols - 1, row, '--secondary');
      }
      Cards.text(c, '⣇' + '⣀'.repeat(cols - 2) + '⣸', 0, rows - 1, '--secondary');
    } else {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 2; col++) Cards.text(c, Cards.cell(dots, W, col, row), col, row, '--secondary');
      }
      Cards.text(c, '⠉'.repeat(cols - 3) + '⢹', 2, 0, '--secondary');
      for (let row = 1; row < rows - 1; row++) Cards.text(c, '⢸', cols - 1, row, '--secondary');
      Cards.text(c, '⣀'.repeat(cols - 3) + '⣸', 2, rows - 1, '--secondary');
    }
  },

  drawSig(c) {
    const { sig } = c;
    Cards.clear(c, sig.c0, sig.r0, sig.sw, sig.sh);
    for (let r = 0; r < sig.sh; r++) for (let col = 0; col < sig.sw; col++) Cards.text(c, Cards.cell(sig.dots, sig.W, col, r), sig.c0 + col, sig.r0 + r, '--main');
    c.signed = sig.dots.includes(1);
  },

  // Drawing in the signature box with a mouse, pen or finger, and the 'x' that clears it. A touch
  // starting in the box draws instead of scrolling the page.
  listen(c) {
    if (c.listening) return;
    c.listening = true;
    const { canvas } = c;
    const at = (x, y) => ({ x: x / c.cellW * 2 - c.sig.c0 * 2, y: y / c.cellH * 4 - c.sig.r0 * 4 });
    const inBox = p => p.x >= 0 && p.y >= 0 && p.x < c.sig.W && p.y < c.sig.H;
    const onX = (x, y) => c.signed && Math.floor(x / c.cellW) === c.sig.end + 1 && Math.floor(y / c.cellH) === c.sig.r0 + c.sig.sh - 1;
    let last = null;
    const plot = p => {
      const n = Math.ceil(Math.max(Math.abs(p.x - last.x), Math.abs(p.y - last.y))) || 1;
      for (let k = 0; k <= n; k++) {
        const X = Math.floor(last.x + (p.x - last.x) * k / n), Y = Math.floor(last.y + (p.y - last.y) * k / n);
        if (X >= 0 && Y >= 0 && X < c.sig.W && Y < c.sig.H) c.sig.dots[Y * c.sig.W + X] = 1;
      }
      last = p;
      this.drawSig(c);
    };
    canvas.addEventListener('pointerdown', e => {
      const p = at(e.offsetX, e.offsetY);
      if (inBox(p)) { last = p; plot(p); canvas.setPointerCapture(e.pointerId); }
      else if (onX(e.offsetX, e.offsetY)) { c.sig.dots.fill(0); this.drawSig(c); }
    });
    canvas.addEventListener('pointermove', e => {
      const p = at(e.offsetX, e.offsetY);
      canvas.style.cursor = inBox(p) || onX(e.offsetX, e.offsetY) ? 'pointer' : '';
      if (last) plot(p);
    });
    const stop = () => { last = null; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('touchstart', e => {
      const r = canvas.getBoundingClientRect(), t = e.touches[0];
      if (inBox(at(t.clientX - r.left, t.clientY - r.top))) e.preventDefault();
    }, { passive: false });
  },

  // The star's frame for this moment (drawn only when it changes), and the clearing 'x' fading in
  // once the box is signed or disappearing once it is cleared.
  tick(c, t) {
    const { sig } = c;
    const xc = sig.end + 1, xr = sig.r0 + sig.sh - 1;
    if (c.signed) {
      if (c.xSince === null) c.xSince = t;
      const a = Math.min(1, (t - c.xSince) / ESO_X_FADE);
      if (a !== c.xShown) {
        c.xShown = a;
        Cards.clear(c, xc, xr, 1, 1);
        Cards.text(c, 'x', xc, xr, Cards.mix(c.color('--bg'), c.color('--secondary'), a));
      }
    } else if (c.xSince !== null) {
      c.xSince = null;
      c.xShown = 0;
      Cards.clear(c, xc, xr, 1, 1);
    }

    const { frames } = ESO_STAR;
    const f = Math.floor(t / ESO_SPIN * frames.length) % frames.length;
    if (f === c.frame) return;
    c.frame = f;
    const { star } = c;
    Cards.clear(c, star.c, star.r, star.w, star.h);
    frames[f].forEach((line, r) => Cards.text(c, line, star.c, star.r + r, '--eso'));
  },
};
