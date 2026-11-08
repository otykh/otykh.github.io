// Cards: sections below the hero, drawn on the same character grid as the hero. Each card has its
// own design (data-design on the section, an object in CARD_DESIGNS) that lays it out and draws it;
// this file sizes the canvas, keeps it updated and gives designs shared drawing helpers. A card's
// text comes from its HTML, a <dl> of label/value pairs that stays for screen readers. Text drawn on
// the canvas also gets an invisible copy laid over it, cell for cell, so it can be selected. A
// card's data-link becomes a real link over the cells its design puts in c.links.
const CARD_GAP = 1;            // cells between a card and the screen edge
const CARD_MAX = 110;          // most columns a card is wide
const CARD_STACK = 64;         // cards narrower than this many columns stack their parts
const CARD_DESIGNS = {};       // design name -> { max?, right?, left?, layout(c) -> rows, draw(c), tick(c, t) }, added by design files

const Cards = {
  cards: [],
  stopped: false,              // set when the page is swallowed: nothing animates any more

  init() {
    for (const el of document.querySelectorAll('.card')) {
      const canvas = el.querySelector('canvas');
      const sheet = document.createElement('div'), copy = document.createElement('div'), links = document.createElement('div');
      sheet.className = 'card-sheet';
      copy.className = 'card-copy';
      copy.setAttribute('aria-hidden', 'true');
      links.className = 'card-links';
      canvas.before(sheet);
      sheet.append(canvas, copy, links);
      const values = [...el.querySelectorAll('dd')].map(dd => dd.textContent.trim().replace(/\s+/g, ' '));
      this.cards.push({
        el, canvas, copy, links, ctx: canvas.getContext('2d'), visible: false, href: el.dataset.link,
        design: CARD_DESIGNS[el.dataset.design],
        fields: [...el.querySelectorAll('dt')].map((dt, i) => [dt.textContent.trim(), values[i]]),
      });
    }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) this.cards.find(c => c.el === e.target).visible = e.isIntersecting;
    });
    for (const c of this.cards) io.observe(c.el);
    window.addEventListener('resize', () => this.layoutAll());
    this.layoutAll();
  },

  layoutAll() {
    for (const c of this.cards) this.layout(c);
  },

  layout(c) {
    const css = getComputedStyle(document.documentElement);
    c.dpr = window.devicePixelRatio || 1;
    c.font = css.getPropertyValue('--font');
    c.ctx.font = `${FONT_SIZE}px ${c.font}`;
    c.cellW = c.ctx.measureText('M').width;
    c.cellH = FONT_SIZE * LINE_HEIGHT;
    const room = Math.min(CARD_MAX, Math.floor(document.documentElement.clientWidth / c.cellW) - 2 * CARD_GAP);
    c.cols = Math.min(c.design.max || CARD_MAX, room);
    c.stacked = c.cols < CARD_STACK;
    c.color = name => css.getPropertyValue(name).trim();
    // Whether the screen is wide enough that cards don't stack.
    const wide = c.wide = room >= CARD_STACK;
    c.rows = c.design.layout(c);

    const w = c.cols;
    c.canvas.width = Math.round(w * c.cellW * c.dpr);
    c.canvas.height = Math.round(c.rows * c.cellH * c.dpr);
    c.canvas.style.width = `${w * c.cellW}px`;
    c.canvas.style.height = `${c.rows * c.cellH}px`;
    // A narrower card with `right` or `left` lines up with that edge of full-width cards, unless
    // the screen is narrow enough that cards stack.
    const sheet = c.canvas.parentElement.style;
    sheet.marginLeft = c.design.right && wide ? `${(room - c.cols) * c.cellW}px` : '';
    const right = c.design.left && wide ? room - c.cols : 0;
    sheet.marginRight = right ? `${right * c.cellW}px` : '';
    const { ctx } = c;
    // Cards are transparent: what is behind them (the page, the sun's heat waves) shows through.
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    ctx.clearRect(0, 0, w * c.cellW, c.rows * c.cellH);
    ctx.font = `${FONT_SIZE}px ${c.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    c.copied = [];
    c.cellLinks = [];
    c.design.draw(c);
    this.copyText(c);
    // Links over the cells the design marked: [col, row, width in cells, label].
    c.links.replaceChildren(...c.cellLinks.map(([col, row, w, label]) => {
      const a = document.createElement('a');
      Object.assign(a, { href: c.href, target: '_blank', rel: 'noopener' });
      a.setAttribute('aria-label', label);
      Object.assign(a.style, { left: `${col * c.cellW}px`, top: `${row * c.cellH}px`, width: `${w * c.cellW}px`, height: `${c.cellH}px` });
      return a;
    }));
  },

  // The selectable copy: text drawn during draw(), pieces that continue each other on a row joined.
  copyText(c) {
    const runs = [];
    for (const [str, col, row] of c.copied) {
      const last = runs.at(-1);
      if (last && last.row === row && last.col + last.str.length === col) last.str += str;
      else runs.push({ str, col, row });
    }
    c.copy.style.fontSize = `${FONT_SIZE}px`;
    // Line breaks between the pieces, so copied text keeps its lines.
    c.copy.replaceChildren(...runs.flatMap(({ str, col, row }) => {
      const span = document.createElement('span');
      span.textContent = str;
      Object.assign(span.style, { left: `${col * c.cellW}px`, top: `${row * c.cellH}px`, lineHeight: `${c.cellH}px` });
      return [span, '\n'];
    }));
    c.copied = null;
  },

  tick(t) {
    // extraVisible: a design's own canvas beyond the card (such as the sun's heat waves) is on screen.
    for (const c of this.cards) if ((c.visible || c.extraVisible) && c.rows) c.design.tick(c, t);
  },

  // Words of `text` in lines at most `width` characters long.
  wrap(text, width) {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      if (line && line.length + 1 + word.length > width) { lines.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    return lines;
  },

  // Draws `str` from cell (col, row) in a CSS color variable or a color.
  text(c, str, col, row, color) {
    if (c.copied && /[^\u2800-\u28ff]/.test(str)) c.copied.push([str, col, row]);
    c.ctx.fillStyle = color.startsWith('--') ? c.color(color) : color;
    // One character per cell; a text-style selector (U+FE0E) stays with the character before it.
    (str.match(/.\uFE0E?/gu) || []).forEach((ch, i) => c.ctx.fillText(ch, (col + i + 0.5) * c.cellW, (row + 0.5) * c.cellH));
  },

  // Clears a block of cells.
  clear(c, col, row, w, h) {
    c.ctx.clearRect(col * c.cellW, row * c.cellH, w * c.cellW, h * c.cellH);
  },

  // The hex color `t` of the way from hex color a to b.
  mix(a, b, t) {
    const rgb = h => h.match(/\w\w/g).map(n => parseInt(n, 16));
    const [x, y] = [rgb(a), rgb(b)];
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  },

  // Braille character for a W × H dot buffer's cell (col, row), leaving out dots set in `except`.
  cell(dots, W, col, row, except) {
    let bits = 0;
    for (let dy = 0; dy < 4; dy++) {
      const i = (row * 4 + dy) * W + col * 2;
      if (dots[i] && !except?.[i]) bits |= DOT_BIT[dy][0];
      if (dots[i + 1] && !except?.[i + 1]) bits |= DOT_BIT[dy][1];
    }
    return String.fromCharCode(0x2800 + bits);
  },
};
