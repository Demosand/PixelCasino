/* =====================================================================
 *  Scratch card — reveal 9 cells, match 3 identical symbols to win
 * ===================================================================== */
(function (global) {
  'use strict';

  const SYMBOLS = [
    { c: '🍒', m: 2, w: 30 },
    { c: '🔔', m: 3, w: 22 },
    { c: '⭐', m: 5, w: 16 },
    { c: '💎', m: 10, w: 10 },
    { c: '🎰', m: 20, w: 6 },
    { c: '👑', m: 50, w: 3 },
    { c: '💰', m: 100, w: 1 },
  ];

  const Scratch = {
    el: null,
    bet: 25,
    cells: [],
    revealed: 0,
    active: false,
  };
  Scratch.open = function (c) {
    this.el = c;
    this.bet = 25;
    this.active = false;
    this.render();
  };
  function pick() {
    const total = SYMBOLS.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const s of SYMBOLS) {
      r -= s.w;
      if (r <= 0) return s;
    }
    return SYMBOLS[0];
  }
  Scratch.render = function () {
    this.el.innerHTML = `
      <div class="scratch">
        <div class="scr-head">Найди 3 одинаковых символа и выиграй!</div>
        <div class="scr-card" id="scrCard"></div>
        <div class="scr-msg" id="scrMsg"></div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Цена билета</span>
            <div class="stepper"><button class="st-btn" data-d="-25">−</button><span class="st-val" id="scrBet">${this.bet}</span><button class="st-btn" data-d="25">+</button></div>
          </div>
          <button class="btn-spin" id="scrBuy"><span>КУПИТЬ БИЛЕТ 🎟️</span></button>
          <button class="btn-clear" id="scrAll" style="display:none">Стереть всё</button>
        </div>
        <div class="scr-legend">${SYMBOLS.map((s) => `<span>${s.c} ${s.m}×</span>`).join('')}</div>
      </div>`;
    const grid = this.el.querySelector('#scrCard');
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'scr-cell';
      cell.dataset.i = i;
      cell.innerHTML = `<div class="scr-sym"></div><div class="scr-cover">?</div>`;
      grid.appendChild(cell);
    }
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.active) return;
        PixelAudio.play('click');
        self.bet = Math.max(25, Math.min(500, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#scrBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#scrBuy').addEventListener('click', () => self.buy());
    this.el.querySelector('#scrAll').addEventListener('click', () => self.revealAll());
  };
  Scratch.buy = function () {
    if (this.active) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    PixelAudio.play('reveal');
    // Build cells with a controlled outcome: first decide win/lose, then lay
    // out symbols so no accidental triples sneak in on losing tickets.
    const isWin = Math.random() < 0.3; // ~30% tickets win (payout weighted by rarity)
    this.cells = new Array(9).fill(null);
    const counts = {};
    const fill = (i) => {
      // pick a symbol that won't create a 3rd copy
      let s;
      let guard = 0;
      do { s = pick(); } while ((counts[s.c] || 0) >= 2 && ++guard < 50);
      if ((counts[s.c] || 0) >= 2) s = SYMBOLS.find((x) => (counts[x.c] || 0) < 2) || s;
      counts[s.c] = (counts[s.c] || 0) + 1;
      this.cells[i] = s;
    };
    if (isWin) {
      const sym = pick();
      const idxs = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, 3);
      idxs.forEach((i) => (this.cells[i] = sym));
      counts[sym.c] = 3;
      for (let i = 0; i < 9; i++) if (!this.cells[i]) fill(i);
    } else {
      for (let i = 0; i < 9; i++) fill(i);
    }
    this.revealed = 0;
    this.active = true;
    this.el.querySelector('#scrMsg').textContent = 'Стирай ячейки! 👆';
    this.el.querySelector('#scrMsg').className = 'scr-msg';
    this.el.querySelector('#scrAll').style.display = 'inline-block';
    this.el.querySelectorAll('.scr-cell').forEach((cell, i) => {
      cell.className = 'scr-cell';
      cell.querySelector('.scr-sym').textContent = this.cells[i].c;
      const cover = cell.querySelector('.scr-cover');
      cover.style.display = 'flex';
      cover.textContent = '?';
      cell.onclick = () => this.scratch(i, cell);
    });
  };
  Scratch.scratch = function (i, cell) {
    if (!this.active || cell.classList.contains('open')) return;
    cell.classList.add('open');
    cell.querySelector('.scr-cover').style.display = 'none';
    PixelAudio.play('scratch');
    setTimeout(() => PixelAudio.play('reveal'), 80);
    this.revealed++;
    if (this.revealed === 9) this.finish();
  };
  Scratch.revealAll = function () {
    if (!this.active) return;
    this.el.querySelectorAll('.scr-cell').forEach((cell) => {
      if (!cell.classList.contains('open')) {
        cell.classList.add('open');
        cell.querySelector('.scr-cover').style.display = 'none';
      }
    });
    PixelAudio.play('scratch');
    this.finish();
  };
  Scratch.finish = function () {
    if (!this.active) return;
    this.active = false;
    const counts = {};
    this.cells.forEach((s) => (counts[s.c] = (counts[s.c] || 0) + 1));
    let best = null;
    this.cells.forEach((s) => {
      if (counts[s.c] >= 3 && (!best || s.m > best.m)) best = s;
    });
    const msg = this.el.querySelector('#scrMsg');
    if (best) {
      const win = this.bet * best.m;
      Casino.win(win);
      // highlight winning cells
      this.el.querySelectorAll('.scr-cell').forEach((cell, i) => {
        if (this.cells[i].c === best.c) cell.classList.add('scr-win');
      });
      msg.textContent = `3× ${best.c} · ${best.m}× → +${Casino.fmt(win)} 🎉`;
      msg.className = 'scr-msg win';
      PixelAudio.play(best.m >= 50 ? 'jackpot' : best.m >= 10 ? 'bigWin' : 'win');
      Casino.confetti({ count: best.m >= 50 ? 160 : 80 });
    } else {
      msg.textContent = 'Нет тройки 😔 Попробуй ещё билет';
      msg.className = 'scr-msg lose';
      PixelAudio.play('lose');
    }
    this.el.querySelector('#scrAll').style.display = 'none';
  };
  global.Scratch = Scratch;
})(window);
