/* =====================================================================
 *  Dragon Tower — climb 8 floors, pick a safe tile each row, avoid the
 *  dragon. Multiplier grows each floor; cash out any time.
 * ===================================================================== */
(function (global) {
  'use strict';

  const FLOORS = 8;

  const DIFF = {
    easy: { cols: 4, eggs: 3, label: 'Лёгкий (3 из 4)' },
    mid: { cols: 3, eggs: 2, label: 'Средний (2 из 3)' },
    hard: { cols: 3, eggs: 1, label: 'Сложный (1 из 3)' },
  };

  const Tower = {
    el: null,
    bet: 30,
    diff: 'mid',
    floor: 0,
    layout: [],
    active: false,
    mult: 1,
  };
  Tower.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.diff = 'mid';
    this.active = false;
    this.render();
  };
  Tower.floorMult = function (f) {
    const d = DIFF[this.diff];
    const p = d.eggs / d.cols; // win prob per row
    let m = 1;
    for (let i = 0; i < f; i++) m *= (1 / p) * 0.97;
    return m;
  };
  Tower.render = function () {
    const d = DIFF[this.diff];
    let rows = '';
    for (let f = FLOORS - 1; f >= 0; f--) {
      let cells = '';
      for (let c = 0; c < d.cols; c++) cells += `<button class="tw-cell" data-f="${f}" data-c="${c}">?</button>`;
      rows += `<div class="tw-row" data-floor="${f}"><span class="tw-mult">${this.floorMult(f + 1).toFixed(2)}×</span><div class="tw-cells">${cells}</div></div>`;
    }
    this.el.innerHTML = `
      <div class="tower">
        <div class="tw-diff" id="twDiff">
          ${Object.entries(DIFF).map(([k, v]) => `<button data-diff="${k}" class="${k === this.diff ? 'on' : ''}">${v.label}</button>`).join('')}
        </div>
        <div class="tw-board" id="twBoard">${rows}</div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="twBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="twStart"><span>В ПУТЬ 🐉</span></button>
          <button class="btn-spin tw-cash" id="twCash" style="display:none">ЗАБРАТЬ <b id="twCashVal"></b></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('[data-diff]').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.active) return;
        PixelAudio.play('click');
        self.diff = b.dataset.diff;
        self.render();
      })
    );
    this.el.querySelectorAll('[data-d]').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.active) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#twBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#twStart').addEventListener('click', () => self.start());
    this.el.querySelector('#twCash').addEventListener('click', () => self.cashOut());
    this.el.querySelectorAll('.tw-cell').forEach((b) =>
      b.addEventListener('click', () => self.pick(parseInt(b.dataset.f), parseInt(b.dataset.c), b))
    );
  };
  Tower.start = function () {
    if (this.active) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    PixelAudio.play('resetClimb');
    const d = DIFF[this.diff];
    this.layout = [];
    for (let f = 0; f < FLOORS; f++) {
      const safe = new Set();
      while (safe.size < d.eggs) safe.add((Math.random() * d.cols) | 0);
      this.layout.push(safe);
    }
    this.floor = 0;
    this.mult = 1;
    this.active = true;
    // reset visuals
    this.el.querySelectorAll('.tw-cell').forEach((c) => {
      c.className = 'tw-cell';
      c.textContent = '?';
      c.disabled = true;
    });
    this.el.querySelector('#twStart').style.display = 'none';
    this.el.querySelector('#twCash').style.display = 'inline-block';
    this.el.querySelector('#twCashVal').textContent = Casino.fmt(this.bet);
    this.enableFloor(0);
  };
  Tower.enableFloor = function (f) {
    this.el.querySelectorAll('.tw-row').forEach((r) => r.classList.remove('active'));
    const row = this.el.querySelector(`.tw-row[data-floor="${f}"]`);
    if (row) row.classList.add('active');
    this.el.querySelectorAll('.tw-cell').forEach((c) => {
      c.disabled = parseInt(c.dataset.f) !== f;
    });
  };
  Tower.pick = function (f, c, btn) {
    if (!this.active || f !== this.floor) return;
    const safe = this.layout[f];
    if (safe.has(c)) {
      btn.classList.add('egg');
      btn.textContent = '🥚';
      PixelAudio.play('climb');
      this.floor++;
      this.mult = this.floorMult(this.floor);
      this.el.querySelector('#twCashVal').textContent = Casino.fmt(Math.round(this.bet * this.mult));
      // reveal other safe eggs faintly on this row
      if (this.floor >= FLOORS) {
        this.win(true);
      } else {
        this.enableFloor(this.floor);
        Casino.toast(`Этаж ${this.floor}! ${this.mult.toFixed(2)}×`, 'good');
      }
    } else {
      btn.classList.add('dragon');
      btn.textContent = '🐉';
      PixelAudio.play('fall');
      Casino.shake(this.el.querySelector('.tw-board'), 1.5);
      this.bust(f);
    }
  };
  Tower.bust = function (f) {
    this.active = false;
    // reveal current row eggs
    const safe = this.layout[f];
    this.el.querySelectorAll(`.tw-cell[data-f="${f}"]`).forEach((c) => {
      c.disabled = true;
      if (safe.has(parseInt(c.dataset.c)) && !c.classList.contains('egg')) {
        c.classList.add('egg-faded');
        c.textContent = '🥚';
      }
    });
    this.el.querySelectorAll('.tw-cell').forEach((c) => (c.disabled = true));
    Casino.toast('🐉 Дракон поймал тебя! Ставка потеряна', 'bad');
    this.reset();
  };
  Tower.win = function (top) {
    const win = Math.round(this.bet * this.mult);
    Casino.win(win);
    PixelAudio.play(top ? 'jackpot' : this.mult >= 5 ? 'bigWin' : 'win');
    Casino.confetti({ count: top ? 170 : 80 });
    Casino.toast(`${top ? '👑 Вершина! ' : ''}Забрано ${this.mult.toFixed(2)}× → +${Casino.fmt(win)} 🎉`, 'good');
    this.active = false;
    this.el.querySelectorAll('.tw-cell').forEach((c) => (c.disabled = true));
    this.reset();
  };
  Tower.cashOut = function () {
    if (!this.active || this.floor === 0) {
      if (this.floor === 0 && this.active) {
        Casino.win(this.bet);
        this.active = false;
        this.reset();
      }
      return;
    }
    this.win(false);
  };
  Tower.reset = function () {
    this.el.querySelector('#twStart').style.display = 'inline-block';
    this.el.querySelector('#twStart').querySelector('span').textContent = 'В ПУТЬ 🐉';
    this.el.querySelector('#twCash').style.display = 'none';
    this.el.querySelectorAll('.tw-row').forEach((r) => r.classList.remove('active'));
  };
  global.Tower = Tower;
})(window);
