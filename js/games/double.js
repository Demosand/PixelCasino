/* =====================================================================
 *  Double — CSGO-style colour ribbon. Bet red/black (2×) or gold (14×).
 * ===================================================================== */
(function (global) {
  'use strict';

  // 15-slot wheel: 7 red, 7 black, 1 gold
  const WHEEL = [];
  (function build() {
    WHEEL.push({ c: 'gold', n: 0 });
    for (let i = 1; i <= 14; i++) WHEEL.push({ c: i % 2 ? 'red' : 'black', n: i });
  })();
  const COLORS = { red: '#c0182f', black: '#16161f', gold: '#ffd23f' };

  const TILE = 84; // px width incl. gap basis

  const Double = {
    el: null,
    bets: { red: 0, black: 0, gold: 0 },
    chip: 10,
    busy: false,
    offset: 0,
  };
  Double.open = function (c) {
    this.el = c;
    this.bets = { red: 0, black: 0, gold: 0 };
    this.chip = 10;
    this.offset = 0;
    this.render();
  };
  Double.render = function () {
    // build a long ribbon of repeated wheels
    let strip = '';
    for (let rep = 0; rep < 30; rep++) {
      WHEEL.forEach((s) => {
        strip += `<div class="dbl-tile dbl-${s.c}">${s.c === 'gold' ? '★' : s.n}</div>`;
      });
    }
    this.el.innerHTML = `
      <div class="double">
        <div class="dbl-window">
          <div class="dbl-pointer"></div>
          <div class="dbl-strip" id="dblStrip">${strip}</div>
        </div>
        <div class="dbl-result" id="dblResult">Сделайте ставку и крутите</div>
        <div class="dbl-bets">
          <button class="dbl-bet red" data-color="red"><span>КРАСНОЕ 2×</span><b class="bet-amt" id="amtRed">0</b></button>
          <button class="dbl-bet gold" data-color="gold"><span>★ ЗОЛОТО 14×</span><b class="bet-amt" id="amtGold">0</b></button>
          <button class="dbl-bet black" data-color="black"><span>ЧЁРНОЕ 2×</span><b class="bet-amt" id="amtBlack">0</b></button>
        </div>
        <div class="r-chips">
          <span class="ctl-label">Фишка:</span>
          ${[5, 10, 25, 100].map((v) => `<button class="chipbtn ${v === 10 ? 'on' : ''}" data-chip="${v}">${v}</button>`).join('')}
          <button class="btn-clear" id="dblClear">Очистить</button>
          <button class="btn-spin" id="dblSpin"><span>КРУТИТЬ 🎨</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('[data-color]').forEach((b) =>
      b.addEventListener('click', () => self.placeBet(b.dataset.color))
    );
    this.el.querySelectorAll('[data-chip]').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.chip = parseInt(b.dataset.chip);
        self.el.querySelectorAll('.chipbtn').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      })
    );
    this.el.querySelector('#dblClear').addEventListener('click', () => {
      if (self.busy) return;
      PixelAudio.play('click');
      self.bets = { red: 0, black: 0, gold: 0 };
      self.refresh();
    });
    this.el.querySelector('#dblSpin').addEventListener('click', () => self.spin());
    // center the strip initially
    requestAnimationFrame(() => this.setOffset(WHEEL.length * 10, false));
  };
  Double.placeBet = function (color) {
    if (this.busy) return;
    if (!Casino.canBet(this.chip)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    Casino.bet(this.chip);
    this.bets[color] += this.chip;
    PixelAudio.play('chip');
    this.refresh();
  };
  Double.refresh = function () {
    this.el.querySelector('#amtRed').textContent = this.bets.red;
    this.el.querySelector('#amtBlack').textContent = this.bets.black;
    this.el.querySelector('#amtGold').textContent = this.bets.gold;
  };
  Double.setOffset = function (tileIndex, animate) {
    const strip = this.el.querySelector('#dblStrip');
    const win = this.el.querySelector('.dbl-window');
    const tileW = strip.children[0].getBoundingClientRect().width + 8; // gap
    const center = win.clientWidth / 2;
    const x = -(tileIndex * tileW) + center - tileW / 2;
    strip.style.transition = animate ? 'transform 5s cubic-bezier(.12,.7,.08,1)' : 'none';
    strip.style.transform = `translateX(${x}px)`;
  };
  Double.spin = function () {
    if (this.busy) return;
    const total = this.bets.red + this.bets.black + this.bets.gold;
    if (total <= 0) {
      PixelAudio.play('error');
      Casino.toast('Сначала сделайте ставку', 'bad');
      return;
    }
    this.busy = true;
    PixelAudio.resume();
    PixelAudio.play('suspense');

    const result = (Math.random() * WHEEL.length) | 0; // index in WHEEL
    const seg = WHEEL[result];
    // land on a repetition far along the strip
    const targetIndex = WHEEL.length * 24 + result;

    // reset near start without animation, then animate to target
    this.setOffset(WHEEL.length * 4 + result, false);
    void this.el.querySelector('#dblStrip').offsetWidth;
    requestAnimationFrame(() => this.setOffset(targetIndex, true));

    const tk = setInterval(() => PixelAudio.play('doubleTick'), 110);
    const res = this.el.querySelector('#dblResult');
    res.textContent = '…';
    res.className = 'dbl-result';

    setTimeout(() => {
      clearInterval(tk);
      this.settle(seg);
    }, 5100);
  };
  Double.settle = function (seg) {
    const res = this.el.querySelector('#dblResult');
    const label = seg.c === 'red' ? 'КРАСНОЕ' : seg.c === 'black' ? 'ЧЁРНОЕ' : '★ ЗОЛОТО';
    res.textContent = `Выпало: ${label}`;
    res.style.color = COLORS[seg.c];

    const mult = seg.c === 'gold' ? 14 : 2;
    const stake = this.bets[seg.c];
    let payout = stake * mult;
    if (payout > 0) {
      Casino.win(payout);
      PixelAudio.play(seg.c === 'gold' ? 'jackpot' : 'win');
      Casino.confetti({ count: seg.c === 'gold' ? 160 : 70 });
      Casino.toast(`${label}! Выигрыш +${Casino.fmt(payout)} 🎉`, 'good');
    } else {
      PixelAudio.play('lose');
      Casino.toast(`${label}. Без выигрыша`, 'bad');
    }
    this.bets = { red: 0, black: 0, gold: 0 };
    this.refresh();
    this.busy = false;
  };
  global.Double = Double;
})(window);
