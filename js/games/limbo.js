/* =====================================================================
 *  Limbo — set a target multiplier; a random crash point is rolled.
 *  Win if the rolled value >= your target.
 * ===================================================================== */
(function (global) {
  'use strict';

  const Limbo = {
    el: null,
    bet: 30,
    target: 2,
    busy: false,
    history: [],
  };
  Limbo.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.target = 2;
    this.render();
  };
  Limbo.chance = function () {
    return (99 / this.target).toFixed(2);
  };
  Limbo.render = function () {
    this.el.innerHTML = `
      <div class="limbo">
        <div class="limbo-display" id="limboDisp">0.00×</div>
        <div class="limbo-history" id="limboHist"></div>
        <div class="limbo-inputs">
          <div class="ctl-group">
            <span class="ctl-label">Цель ×</span>
            <div class="stepper wide">
              <button class="st-btn" data-t="-0.5">−</button>
              <input id="limboTarget" class="limbo-target" value="2.00" />
              <button class="st-btn" data-t="0.5">+</button>
            </div>
          </div>
          <div class="ctl-group"><span class="ctl-label">Шанс</span><b class="limbo-stat" id="limboChance">49.50%</b></div>
          <div class="ctl-group"><span class="ctl-label">Выплата</span><b class="limbo-stat" id="limboPay">${Casino.fmt(this.bet * this.target)}</b></div>
        </div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="limboBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="limboBtn"><span>СТАВКА 🚀</span></button>
        </div>
      </div>`;
    const self = this;
    const tin = this.el.querySelector('#limboTarget');
    const sync = () => {
      let v = parseFloat(tin.value.replace(',', '.'));
      if (isNaN(v) || v < 1.01) v = 1.01;
      if (v > 1000) v = 1000;
      self.target = Math.round(v * 100) / 100;
      tin.value = self.target.toFixed(2);
      self.el.querySelector('#limboChance').textContent = self.chance() + '%';
      self.el.querySelector('#limboPay').textContent = Casino.fmt(Math.round(self.bet * self.target));
    };
    tin.addEventListener('change', sync);
    this.el.querySelectorAll('[data-t]').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.target = Math.max(1.01, Math.round((self.target + parseFloat(b.dataset.t)) * 100) / 100);
        tin.value = self.target.toFixed(2);
        sync();
      })
    );
    this.el.querySelectorAll('[data-d]').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.busy) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#limboBet').textContent = self.bet;
        sync();
      })
    );
    this.el.querySelector('#limboBtn').addEventListener('click', () => self.play());
  };
  Limbo.play = function () {
    if (this.busy) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.busy = true;
    PixelAudio.resume();
    PixelAudio.play('rocketUp');
    // generate result with ~1% house edge
    const r = Math.random();
    const result = Math.max(1, Math.floor((0.99 / (1 - r)) * 100) / 100);
    const disp = this.el.querySelector('#limboDisp');
    disp.className = 'limbo-display';

    const start = performance.now();
    const dur = 1100;
    const animate = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = 1 + (result - 1) * eased;
      disp.textContent = v.toFixed(2) + '×';
      if (p < 0.3) PixelAudio.play('sevenSeg');
      if (p < 1) requestAnimationFrame(animate);
      else this.settle(result);
    };
    requestAnimationFrame(animate);
  };
  Limbo.settle = function (result) {
    const disp = this.el.querySelector('#limboDisp');
    disp.textContent = result.toFixed(2) + '×';
    const win = result >= this.target;
    this.history.unshift({ v: result, win });
    this.history = this.history.slice(0, 12);
    this.el.querySelector('#limboHist').innerHTML = this.history
      .map((h) => `<span class="h-pill ${h.win ? 'h-warm' : 'h-cool'}">${h.v.toFixed(2)}×</span>`)
      .join('');

    if (win) {
      disp.classList.add('win');
      const payout = Math.round(this.bet * this.target);
      Casino.win(payout);
      PixelAudio.play(this.target >= 10 ? 'jackpot' : this.target >= 3 ? 'bigWin' : 'win');
      Casino.confetti({ count: this.target >= 10 ? 150 : 70 });
      Casino.toast(`${result.toFixed(2)}× ≥ ${this.target}× → +${Casino.fmt(payout)} 🎉`, 'good');
    } else {
      disp.classList.add('lose');
      PixelAudio.play('lose');
      Casino.shake(disp, 1);
    }
    setTimeout(() => (disp.className = 'limbo-display'), 1200);
    this.busy = false;
  };
  global.Limbo = Limbo;
})(window);
