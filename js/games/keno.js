/* =====================================================================
 *  Keno — pick up to 10 from a 40-number grid, 10 are drawn
 * ===================================================================== */
(function (global) {
  'use strict';

  const SIZE = 40;
  const DRAW = 10;
  const MAXPICK = 10;

  // payout multipliers indexed by [picks][matches]
  function payTable(picks, matches) {
    const T = {
      1: [0, 3.6],
      2: [0, 1, 9],
      3: [0, 1, 3, 25],
      4: [0, 0.5, 2, 8, 55],
      5: [0, 0.5, 1.5, 4, 18, 110],
      6: [0, 0, 1, 3, 8, 35, 220],
      7: [0, 0, 0.7, 2, 5, 18, 70, 400],
      8: [0, 0, 0.5, 1.5, 4, 11, 45, 200, 700],
      9: [0, 0, 0.4, 1, 3, 7, 25, 90, 350, 1200],
      10: [0, 0, 0, 1, 2.5, 6, 18, 60, 200, 600, 2000],
    };
    const row = T[picks] || [];
    return row[matches] || 0;
  }

  const Keno = {
    el: null,
    bet: 20,
    picks: new Set(),
    busy: false,
  };
  Keno.open = function (c) {
    this.el = c;
    this.bet = 20;
    this.picks = new Set();
    this.render();
  };
  Keno.render = function () {
    let grid = '';
    for (let n = 1; n <= SIZE; n++) grid += `<button class="keno-cell" data-n="${n}">${n}</button>`;
    this.el.innerHTML = `
      <div class="keno">
        <div class="keno-top">
          <div class="keno-stat"><span>Выбрано</span><b id="kPicked">0 / ${MAXPICK}</b></div>
          <div class="keno-stat"><span>Совпадений</span><b id="kHits">—</b></div>
          <div class="keno-stat"><span>Выигрыш</span><b id="kWin">0</b></div>
        </div>
        <div class="keno-grid" id="kenoGrid">${grid}</div>
        <div class="keno-controls">
          <button class="btn-clear" id="kClear">Очистить</button>
          <button class="btn-clear" id="kLucky">🎲 Случайно</button>
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="kBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="kPlay"><span>ИГРАТЬ 🎯</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('.keno-cell').forEach((b) =>
      b.addEventListener('click', () => self.toggle(parseInt(b.dataset.n), b))
    );
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.busy) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(500, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#kBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#kClear').addEventListener('click', () => self.clear());
    this.el.querySelector('#kLucky').addEventListener('click', () => self.lucky());
    this.el.querySelector('#kPlay').addEventListener('click', () => self.play());
  };
  Keno.toggle = function (n, btn) {
    if (this.busy) return;
    if (this.picks.has(n)) {
      this.picks.delete(n);
      btn.classList.remove('picked');
      PixelAudio.play('click');
    } else {
      if (this.picks.size >= MAXPICK) {
        PixelAudio.play('error');
        Casino.toast(`Максимум ${MAXPICK} чисел`, 'bad');
        return;
      }
      this.picks.add(n);
      btn.classList.add('picked');
      PixelAudio.play('chip');
    }
    this.el.querySelector('#kPicked').textContent = `${this.picks.size} / ${MAXPICK}`;
  };
  Keno.clear = function () {
    if (this.busy) return;
    this.picks.clear();
    this.el.querySelectorAll('.keno-cell').forEach((c) => c.classList.remove('picked', 'hit', 'miss', 'drawn'));
    this.el.querySelector('#kPicked').textContent = `0 / ${MAXPICK}`;
    PixelAudio.play('click');
  };
  Keno.lucky = function () {
    if (this.busy) return;
    this.clear();
    const count = 6;
    while (this.picks.size < count) {
      const n = 1 + ((Math.random() * SIZE) | 0);
      if (!this.picks.has(n)) {
        this.picks.add(n);
        this.el.querySelector(`.keno-cell[data-n="${n}"]`).classList.add('picked');
        PixelAudio.play('chip');
      }
    }
    this.el.querySelector('#kPicked').textContent = `${this.picks.size} / ${MAXPICK}`;
  };
  Keno.play = function () {
    if (this.busy) return;
    if (this.picks.size === 0) {
      PixelAudio.play('error');
      Casino.toast('Выберите хотя бы одно число', 'bad');
      return;
    }
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.busy = true;
    PixelAudio.resume();
    this.el.querySelectorAll('.keno-cell').forEach((c) => c.classList.remove('hit', 'miss', 'drawn'));

    // draw
    const pool = [];
    for (let n = 1; n <= SIZE; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const drawn = pool.slice(0, DRAW);

    let idx = 0;
    let hits = 0;
    const reveal = () => {
      if (idx >= drawn.length) {
        this.settle(hits);
        return;
      }
      const n = drawn[idx++];
      const cell = this.el.querySelector(`.keno-cell[data-n="${n}"]`);
      if (this.picks.has(n)) {
        cell.classList.add('hit');
        hits++;
        PixelAudio.play('kenoHit');
        this.el.querySelector('#kHits').textContent = hits;
      } else {
        cell.classList.add('drawn');
        PixelAudio.play('kenoDraw');
      }
      setTimeout(reveal, 220);
    };
    this.el.querySelector('#kHits').textContent = '0';
    reveal();
  };
  Keno.settle = function (hits) {
    const mult = payTable(this.picks.size, hits);
    const win = Math.round(this.bet * mult);
    this.el.querySelector('#kWin').textContent = Casino.fmt(win);
    if (win > 0) {
      Casino.win(win);
      PixelAudio.play(mult >= 50 ? 'jackpot' : mult >= 5 ? 'bigWin' : 'win');
      Casino.confetti({ count: mult >= 50 ? 160 : 80 });
      Casino.toast(`${hits} совпадений · ${mult}× → +${Casino.fmt(win)} 🎉`, 'good');
    } else {
      PixelAudio.play('lose');
      Casino.toast(`${hits} совпадений — без выигрыша`, 'bad');
    }
    this.busy = false;
  };
  global.Keno = Keno;
})(window);
