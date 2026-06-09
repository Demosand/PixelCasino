/* =====================================================================
 *  Slots — multiple themed machines with real scrolling reels,
 *  paylines, wilds, scatters, free spins, and a progressive feel.
 * ===================================================================== */
(function (global) {
  'use strict';

  /* Each machine: symbols carry weight (rarity) + pay multipliers for
   * matching 3 / 4 / 5 on a payline (per-bet-per-line multiplier). */
  const MACHINES = [
    {
      id: 'fruit',
      name: 'Fruit Fiesta',
      tag: 'Классика',
      theme: 'm-fruit',
      icon: '🍒',
      reels: 5,
      rows: 3,
      symbols: [
        { c: '🍒', w: 26, p: [0, 0, 5, 15, 40] },
        { c: '🍋', w: 24, p: [0, 0, 6, 18, 45] },
        { c: '🍊', w: 22, p: [0, 0, 8, 22, 55] },
        { c: '🍉', w: 18, p: [0, 0, 12, 35, 90] },
        { c: '🍇', w: 14, p: [0, 0, 16, 50, 130] },
        { c: '🔔', w: 9, p: [0, 0, 25, 80, 220] },
        { c: '⭐', w: 6, p: [0, 0, 40, 150, 400], wild: true },
        { c: '💎', w: 4, p: [0, 0, 60, 250, 800], scatter: true },
      ],
    },
    {
      id: 'egypt',
      name: 'Pharaoh Gold',
      tag: 'Древний Египет',
      theme: 'm-egypt',
      icon: '🔺',
      reels: 5,
      rows: 3,
      symbols: [
        { c: '🪲', w: 26, p: [0, 0, 5, 14, 38] },
        { c: '🐍', w: 22, p: [0, 0, 7, 20, 50] },
        { c: '🏺', w: 20, p: [0, 0, 10, 28, 70] },
        { c: '🐈', w: 16, p: [0, 0, 14, 42, 110] },
        { c: '👁️', w: 12, p: [0, 0, 20, 65, 170] },
        { c: '🔺', w: 8, p: [0, 0, 35, 120, 320] },
        { c: '👑', w: 5, p: [0, 0, 50, 200, 600], wild: true },
        { c: '📜', w: 4, p: [0, 0, 70, 300, 1000], scatter: true },
      ],
    },
    {
      id: 'space',
      name: 'Galaxy Quest',
      tag: 'Космос',
      theme: 'm-space',
      icon: '🚀',
      reels: 5,
      rows: 3,
      symbols: [
        { c: '☄️', w: 26, p: [0, 0, 5, 15, 40] },
        { c: '🛸', w: 22, p: [0, 0, 8, 22, 55] },
        { c: '🪐', w: 19, p: [0, 0, 11, 30, 75] },
        { c: '🌟', w: 15, p: [0, 0, 15, 45, 120] },
        { c: '👽', w: 11, p: [0, 0, 22, 70, 180] },
        { c: '🚀', w: 7, p: [0, 0, 38, 130, 350] },
        { c: '🌌', w: 5, p: [0, 0, 55, 220, 650], wild: true },
        { c: '🛰️', w: 4, p: [0, 0, 75, 320, 1100], scatter: true },
      ],
    },
    {
      id: 'diamond',
      name: 'Diamond Deluxe',
      tag: 'VIP',
      theme: 'm-diamond',
      icon: '💎',
      reels: 5,
      rows: 3,
      symbols: [
        { c: '🔷', w: 26, p: [0, 0, 6, 16, 42] },
        { c: '🔶', w: 23, p: [0, 0, 8, 22, 55] },
        { c: '💍', w: 19, p: [0, 0, 12, 34, 88] },
        { c: '💠', w: 15, p: [0, 0, 17, 50, 130] },
        { c: '🏆', w: 11, p: [0, 0, 24, 75, 200] },
        { c: '💎', w: 7, p: [0, 0, 42, 150, 420] },
        { c: '👑', w: 5, p: [0, 0, 60, 250, 750], wild: true },
        { c: '💰', w: 4, p: [0, 0, 80, 350, 1200], scatter: true },
      ],
    },
    {
      id: 'lucky7',
      name: 'Lucky Sevens',
      tag: 'Ретро',
      theme: 'm-lucky7',
      icon: '7️⃣',
      reels: 3,
      rows: 3,
      symbols: [
        { c: '🍒', w: 30, p: [0, 0, 8] },
        { c: '🍋', w: 26, p: [0, 0, 12] },
        { c: '🔔', w: 20, p: [0, 0, 20] },
        { c: '⭐', w: 14, p: [0, 0, 40] },
        { c: '💰', w: 8, p: [0, 0, 80] },
        { c: '7️⃣', w: 5, p: [0, 0, 200] },
        { c: '💎', w: 4, p: [0, 0, 400], wild: true },
      ],
    },
    {
      id: 'west',
      name: 'Wild West',
      tag: 'Дикий Запад',
      theme: 'm-west',
      icon: '🤠',
      reels: 5,
      rows: 3,
      symbols: [
        { c: '🌵', w: 26, p: [0, 0, 5, 15, 40] },
        { c: '🐎', w: 22, p: [0, 0, 8, 22, 55] },
        { c: '🥃', w: 19, p: [0, 0, 11, 32, 80] },
        { c: '🔫', w: 15, p: [0, 0, 16, 48, 125] },
        { c: '🤠', w: 11, p: [0, 0, 24, 75, 190] },
        { c: '⭐', w: 7, p: [0, 0, 40, 140, 380] },
        { c: '🏅', w: 5, p: [0, 0, 58, 230, 700], wild: true },
        { c: '💰', w: 4, p: [0, 0, 78, 330, 1150], scatter: true },
      ],
    },
    {
      id: 'ocean',
      name: 'Ocean Treasure',
      tag: 'Океан',
      theme: 'm-ocean',
      icon: '🐠',
      reels: 5,
      rows: 3,
      symbols: [
        { c: '🐚', w: 26, p: [0, 0, 5, 14, 38] },
        { c: '🐠', w: 22, p: [0, 0, 8, 22, 55] },
        { c: '🦀', w: 19, p: [0, 0, 11, 30, 76] },
        { c: '🐙', w: 15, p: [0, 0, 16, 46, 120] },
        { c: '🦈', w: 11, p: [0, 0, 23, 72, 185] },
        { c: '🧜', w: 7, p: [0, 0, 40, 140, 380] },
        { c: '⚓', w: 5, p: [0, 0, 56, 220, 660], wild: true },
        { c: '💰', w: 4, p: [0, 0, 76, 320, 1100], scatter: true },
      ],
    },
    {
      id: 'neon',
      name: 'Neon Nights',
      tag: 'Синтвейв',
      theme: 'm-neon',
      icon: '🌆',
      reels: 5,
      rows: 3,
      symbols: [
        { c: '🎵', w: 26, p: [0, 0, 6, 16, 42] },
        { c: '🕹️', w: 22, p: [0, 0, 9, 24, 60] },
        { c: '🎲', w: 19, p: [0, 0, 12, 34, 86] },
        { c: '🍸', w: 15, p: [0, 0, 18, 52, 135] },
        { c: '💜', w: 11, p: [0, 0, 25, 78, 200] },
        { c: '🌆', w: 7, p: [0, 0, 42, 150, 400] },
        { c: '⚡', w: 5, p: [0, 0, 60, 240, 720], wild: true },
        { c: '💎', w: 4, p: [0, 0, 82, 350, 1200], scatter: true },
      ],
    },
  ];

  /* horizontal paylines for a 3-row grid (index = row per reel) */
  function buildLines(reels, rows) {
    const lines = [];
    // straight rows
    for (let r = 0; r < rows; r++) lines.push(new Array(reels).fill(r));
    if (rows >= 3) {
      // V and ^ zigzags
      const v = [],
        a = [];
      for (let i = 0; i < reels; i++) {
        const mid = (reels - 1) / 2;
        v.push(Math.round((Math.abs(i - mid) / mid) * (rows - 1)) || 0);
        a.push(rows - 1 - (Math.round((Math.abs(i - mid) / mid) * (rows - 1)) || 0));
      }
      lines.push(v, a);
    }
    return lines;
  }

  const Slots = {
    current: null,
    el: null,
    bet: 10,
    lines: 5,
    spinning: false,
    autoSpin: false,
    grid: [], // [reel][row] symbol objects
  };

  function weightedPick(symbols) {
    const total = symbols.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const s of symbols) {
      r -= s.w;
      if (r <= 0) return s;
    }
    return symbols[symbols.length - 1];
  }

  Slots.open = function (container, machineId) {
    this.current = MACHINES.find((m) => m.id === machineId) || MACHINES[0];
    this.el = container;
    this.bet = 10;
    this.lines = Math.min(5, buildLines(this.current.reels, this.current.rows).length);
    this.render();
  };

  Slots.listMachines = function () {
    return MACHINES;
  };

  Slots.render = function () {
    const m = this.current;
    const allLines = buildLines(m.reels, m.rows);
    this.allLines = allLines;
    this.lines = Math.min(this.lines, allLines.length);

    this.el.innerHTML = `
      <div class="slot ${m.theme}">
        <div class="slot-head">
          <div class="slot-title"><span class="slot-ic">${m.icon}</span>${m.name}</div>
          <div class="slot-tag">${m.tag} · ${m.reels}×${m.rows}</div>
        </div>
        <div class="slot-win-banner" id="slotBanner"></div>
        <div class="reels" id="reels"></div>
        <div class="slot-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка/линия</span>
            <div class="stepper">
              <button class="st-btn" data-bet="-1">−</button>
              <span class="st-val" id="betVal">${this.bet}</span>
              <button class="st-btn" data-bet="1">+</button>
            </div>
          </div>
          <div class="ctl-group">
            <span class="ctl-label">Линии</span>
            <div class="stepper">
              <button class="st-btn" data-lines="-1">−</button>
              <span class="st-val" id="lineVal">${this.lines}</span>
              <button class="st-btn" data-lines="1">+</button>
            </div>
          </div>
          <div class="ctl-group total">
            <span class="ctl-label">Всего</span>
            <span class="ctl-total" id="totalBet">${this.bet * this.lines}</span>
          </div>
          <div class="ctl-actions">
            <button class="btn-auto" id="autoBtn">АВТО</button>
            <button class="btn-spin" id="spinBtn"><span>КРУТИТЬ</span></button>
          </div>
        </div>
        <div class="paytable" id="paytable"></div>
      </div>
    `;

    const reelsEl = this.el.querySelector('#reels');
    reelsEl.style.setProperty('--reels', m.reels);
    reelsEl.style.setProperty('--rows', m.rows);
    for (let i = 0; i < m.reels; i++) {
      const reel = document.createElement('div');
      reel.className = 'reel';
      const strip = document.createElement('div');
      strip.className = 'reel-strip';
      reel.appendChild(strip);
      reelsEl.appendChild(reel);
    }

    // initial random grid
    this.grid = [];
    for (let i = 0; i < m.reels; i++) {
      const col = [];
      const strip = reelsEl.children[i].firstChild;
      strip.innerHTML = '';
      for (let r = 0; r < m.rows; r++) {
        const sym = weightedPick(m.symbols);
        col.push(sym);
        strip.appendChild(makeCell(sym));
      }
      this.grid.push(col);
    }

    this.renderPaytable();
    this.bind();
  };

  function makeCell(sym) {
    const d = document.createElement('div');
    d.className = 'sym' + (sym.wild ? ' wild' : '') + (sym.scatter ? ' scatter' : '');
    d.textContent = sym.c;
    return d;
  }

  Slots.renderPaytable = function () {
    const m = this.current;
    const pt = this.el.querySelector('#paytable');
    const top = m.symbols.slice().reverse().slice(0, 4);
    pt.innerHTML =
      '<div class="pt-title">Таблица выплат (×ставка)</div><div class="pt-grid">' +
      m.symbols
        .map((s) => {
          const best = s.p[s.p.length - 1];
          const tag = s.wild ? ' <b>WILD</b>' : s.scatter ? ' <b>SCATTER</b>' : '';
          return `<div class="pt-row"><span class="pt-sym">${s.c}</span><span class="pt-pay">×${best}${tag}</span></div>`;
        })
        .join('') +
      '</div>';
  };

  Slots.bind = function () {
    const self = this;
    const q = (s) => this.el.querySelector(s);

    this.el.querySelectorAll('.st-btn').forEach((b) => {
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        if (b.dataset.bet) {
          self.bet = Math.max(1, Math.min(500, self.bet + parseInt(b.dataset.bet) * (self.bet >= 50 ? 10 : 5)));
          q('#betVal').textContent = self.bet;
        } else {
          self.lines = Math.max(1, Math.min(self.allLines.length, self.lines + parseInt(b.dataset.lines)));
          q('#lineVal').textContent = self.lines;
        }
        q('#totalBet').textContent = self.bet * self.lines;
      });
    });

    q('#spinBtn').addEventListener('click', () => self.spin());
    q('#autoBtn').addEventListener('click', () => {
      PixelAudio.play('click');
      self.autoSpin = !self.autoSpin;
      q('#autoBtn').classList.toggle('on', self.autoSpin);
      if (self.autoSpin && !self.spinning) self.spin();
    });
  };

  Slots.spin = function () {
    if (this.spinning) return;
    const m = this.current;
    const total = this.bet * this.lines;
    if (!Casino.bet(total)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      this.autoSpin = false;
      this.el.querySelector('#autoBtn').classList.remove('on');
      return;
    }
    this.spinning = true;
    Casino.state.spins++;
    PixelAudio.resume();
    PixelAudio.play('spin');

    const banner = this.el.querySelector('#slotBanner');
    banner.className = 'slot-win-banner';
    banner.textContent = '';

    const spinBtn = this.el.querySelector('#spinBtn');
    spinBtn.classList.add('spinning');

    // generate result grid
    const result = [];
    for (let i = 0; i < m.reels; i++) {
      const col = [];
      for (let r = 0; r < m.rows; r++) col.push(weightedPick(m.symbols));
      result.push(col);
    }

    const reelsEl = this.el.querySelector('#reels');
    const reels = reelsEl.querySelectorAll('.reel');
    let finished = 0;
    const tickTimers = [];

    reels.forEach((reel, i) => {
      const strip = reel.firstChild;
      // build a long spinning strip: blur symbols + final rows at the bottom
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = '';
      const blurCount = 18 + i * 4;
      for (let k = 0; k < blurCount; k++) strip.appendChild(makeCell(weightedPick(m.symbols)));
      for (let r = 0; r < m.rows; r++) strip.appendChild(makeCell(result[i][r]));

      // ticking sound while spinning
      const tt = setInterval(() => PixelAudio.play('reelTick'), 70 + i * 8);
      tickTimers.push(tt);

      // force reflow then animate
      void strip.offsetHeight;
      const cellH = reel.clientHeight / m.rows;
      const dist = (blurCount) * cellH;
      const dur = 900 + i * 260;
      strip.style.transition = `transform ${dur}ms cubic-bezier(.18,.7,.16,1)`;
      strip.style.transform = `translateY(-${dist}px)`;

      const done = () => {
        clearInterval(tt);
        PixelAudio.play('reelStop');
        reel.classList.add('reel-bounce');
        setTimeout(() => reel.classList.remove('reel-bounce'), 320);
        finished++;
        if (finished === m.reels) {
          this.grid = result;
          setTimeout(() => this.evaluate(result, total), 180);
        }
      };
      strip.addEventListener('transitionend', done, { once: true });
      // safety
      setTimeout(() => {
        if (finished < i + 1) done();
      }, dur + 400);
    });
  };

  Slots.evaluate = function (result, totalBet) {
    const m = this.current;
    const spinBtn = this.el.querySelector('#spinBtn');
    spinBtn.classList.remove('spinning');

    let win = 0;
    const winningCells = new Set();
    const wins = [];

    // payline evaluation (left to right), wild substitutes
    for (let li = 0; li < this.lines; li++) {
      const line = this.allLines[li];
      const first = result[0][line[0]];
      // determine base symbol (skip leading wilds for naming)
      let base = first;
      if (first.wild) {
        for (let i = 1; i < m.reels; i++) {
          if (!result[i][line[i]].wild) {
            base = result[i][line[i]];
            break;
          }
        }
      }
      if (base.scatter) continue; // scatters pay differently
      let matched = 0;
      const cells = [];
      for (let i = 0; i < m.reels; i++) {
        const s = result[i][line[i]];
        if (s.c === base.c || s.wild) {
          matched++;
          cells.push([i, line[i]]);
        } else break;
      }
      const payIdx = matched - 1;
      if (matched >= 3 && base.p[payIdx]) {
        const lineWin = base.p[payIdx] * this.bet;
        win += lineWin;
        wins.push({ sym: base.c, n: matched, amt: lineWin });
        cells.forEach((c) => winningCells.add(c[0] + ':' + c[1]));
      }
    }

    // scatter pays (anywhere)
    const scatter = m.symbols.find((s) => s.scatter);
    if (scatter) {
      let count = 0;
      const scells = [];
      for (let i = 0; i < m.reels; i++)
        for (let r = 0; r < m.rows; r++)
          if (result[i][r].c === scatter.c) {
            count++;
            scells.push(i + ':' + r);
          }
      const idx = count - 1;
      if (count >= 3 && scatter.p[Math.min(idx, scatter.p.length - 1)]) {
        const sw = scatter.p[Math.min(idx, scatter.p.length - 1)] * this.bet;
        win += sw;
        wins.push({ sym: scatter.c, n: count, amt: sw, scatter: true });
        scells.forEach((c) => winningCells.add(c));
      }
    }

    // highlight winning cells
    if (winningCells.size) this.highlight(winningCells);

    const banner = this.el.querySelector('#slotBanner');
    if (win > 0) {
      Casino.win(win);
      const ratio = win / totalBet;
      let kind = 'win';
      if (ratio >= 50) kind = 'jackpot';
      else if (ratio >= 15) kind = 'big';

      if (kind === 'jackpot') {
        PixelAudio.play('jackpot');
        banner.className = 'slot-win-banner show jackpot';
        banner.innerHTML = `💥 ДЖЕКПОТ! +${Casino.fmt(win)} 💥`;
        Casino.confetti({ count: 160 });
        Casino.shake(this.el.querySelector('.slot'), 2);
      } else if (kind === 'big') {
        PixelAudio.play('bigWin');
        banner.className = 'slot-win-banner show big';
        banner.innerHTML = `🔥 БОЛЬШОЙ ВЫИГРЫШ +${Casino.fmt(win)}`;
        Casino.confetti({ count: 90 });
        Casino.shake(this.el.querySelector('.slot'), 1);
      } else {
        PixelAudio.play('win');
        banner.className = 'slot-win-banner show';
        banner.innerHTML = `✨ Выигрыш +${Casino.fmt(win)}`;
      }
      const r = spinBtn.getBoundingClientRect();
      Casino.coinBurst(r.left + r.width / 2, r.top);
    } else {
      PixelAudio.play('lose');
    }

    this.spinning = false;
    if (this.autoSpin) {
      if (Casino.canBet(this.bet * this.lines)) setTimeout(() => this.spin(), 900);
      else {
        this.autoSpin = false;
        this.el.querySelector('#autoBtn').classList.remove('on');
      }
    }
  };

  Slots.highlight = function (cells) {
    const m = this.current;
    const reels = this.el.querySelectorAll('.reel');
    reels.forEach((reel, i) => {
      const cellsEls = reel.querySelectorAll('.sym');
      // last `rows` cells are the visible result
      const start = cellsEls.length - m.rows;
      for (let r = 0; r < m.rows; r++) {
        if (cells.has(i + ':' + r)) {
          const el = cellsEls[start + r];
          if (el) el.classList.add('win-cell');
        }
      }
    });
  };

  global.Slots = Slots;
})(window);
