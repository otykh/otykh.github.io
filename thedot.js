// The Dot card: full width, framed in braille and split in two. One section holds the title as
// large lettering drawn in braille (pre-rendered in dot-title.js from the game's narrow sans) in
// dark dots, with the year in pale text in its bottom left corner (set in the split when stacked); the other holds the description, whose opening
// "The Dot" is followed by a link icon. Wide screens put the sections side by side with a split
// between them; narrow ones stack them with a split across.
const DOT_PAD = [3, 2];        // cells between the frame or split and the contents: columns, rows
const DOT_LINK = '↪︎'; // hooked arrow after "The Dot" in the description, linking to the game
const DOT_MARK = '↪';     // stands in for the link icon while wrapping (one character wide)
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
    for (let x = 0; x < W; x++) frame[x] = frame[(H - 1) * W + x] = 1;
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

    a.lines.forEach((line, r) => Cards.text(c, line, c.ac, c.ar + r, '--main'));
    if (split.col) Cards.text(c, c.year, 2, rows - 2, '--secondary');
    else Cards.text(c, c.year, c.yc, split.row, '--secondary');

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

  tick() {},
};
