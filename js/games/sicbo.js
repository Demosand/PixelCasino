/* =====================================================================
 *  Sic Bo — 3 dice, bet on Small/Big, totals, triples
 * ===================================================================== */
(function (global) {
  'use strict';

  const PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  const SicBo = {
    el: null,
    chip: 10,
    bets: {},
    busy: false,
  };
  SicBo.open = function (c) {
    this.el = c;
    this.chip = 10;
    this.bets = {};
    this.render();
  };
  SicBo.render = function () {
    const totals = [];
    for (let t = 4; t <= 17; t++) totals.push(`<button class="sb-bet sb-total" data-bet="total:${t}">${t}<small>${totalPay(t)}×</small></button>`);
    const singles = [1, 2, 3, 4, 5, 6]
      .map((n) => `<button class="sb-bet sb-single" data-bet="single:${n}">${PIPS[n]}<small>до 4×</small></button>`)
      .join('');
    const triples = [1, 2, 3, 4, 5, 6]
      .map((n) => `<button class="sb-bet sb-triple" data-bet="triple:${n}">${PIPS[n]}${PIPS[n]}${PIPS[n]}<small>180×</small></button>`)
      .join('');

    this.el.innerHTML = `
      <div class="sicbo">
        <div class="sb-dice" id="sbDice">
          <div class="sb-die">⚀</div><div class="sb-die">⚀</div><div class="sb-die">⚀</div>
        </div>
        <div class="sb-result" id="sbResult">Делайте ставки</div>
        <div class="sb-big-row">
          <button class="sb-bet sb-big" data-bet="small">МАЛОЕ (4-10)<small>2×</small></button>
          <button class="sb-bet sb-big" data-bet="anytriple">ЛЮБОЙ ТРИПЛЕТ<small>31×</small></button>
          <button class="sb-bet sb-big" data-bet="big">БОЛЬШОЕ (11-17)<small>2×</small></button>
        </div>
        <div class="sb-label">Сумма трёх костей</div>
        <div class="sb-totals">${totals.join('')}</div>
        <div class="sb-two-col">
          <div><div class="sb-label">Одно число (1-3 совпадения)</div><div class="sb-singles">${singles}</div></div>
          <div><div class="sb-label">Триплет</div><div class="sb-triples">${triples}</div></div>
        </div>
        <div class="r-chips">
          <span class="ctl-label">Фишка:</span>
          ${[5, 10, 25, 100].map((v) => `<button class="chipbtn ${v === 10 ? 'on' : ''}" data-chip="${v}">${v}</button>`).join('')}
          <button class="btn-clear" id="sbClear">Очистить</button>
          <span class="r-totalbet">Ставка: <b id="sbTotal">0</b></span>
          <button class="btn-spin" id="sbRoll"><span>БРОСИТЬ 🎲</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('[data-bet]').forEach((b) => b.addEventListener('click', () => self.place(b)));
    this.el.querySelectorAll('[data-chip]').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.chip = parseInt(b.dataset.chip);
        self.el.querySelectorAll('.chipbtn').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      })
    );
    this.el.querySelector('#sbClear').addEventListener('click', () => {
      PixelAudio.play('click');
      self.bets = {};
      self.refresh();
    });
    this.el.querySelector('#sbRoll').addEventListener('click', () => self.roll());
  };
  function totalPay(t) {
    const m = { 4: 60, 5: 30, 6: 18, 7: 12, 8: 8, 9: 7, 10: 6, 11: 6, 12: 7, 13: 8, 14: 12, 15: 18, 16: 30, 17: 60 };
    return m[t] || 0;
  }
  SicBo.place = function (btn) {
    if (this.busy) return;
    if (!Casino.canBet(this.chip)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    Casino.bet(this.chip);
    const key = btn.dataset.bet;
    this.bets[key] = (this.bets[key] || 0) + this.chip;
    PixelAudio.play('chip');
    this.refresh();
  };
  SicBo.refresh = function () {
    let total = 0;
    Object.values(this.bets).forEach((v) => (total += v));
    this.el.querySelector('#sbTotal').textContent = Casino.fmt(total);
    this.el.querySelectorAll('[data-bet]').forEach((b) => {
      const amt = this.bets[b.dataset.bet];
      let pill = b.querySelector('.bet-pill');
      if (amt) {
        if (!pill) {
          pill = document.createElement('span');
          pill.className = 'bet-pill';
          b.appendChild(pill);
        }
        pill.textContent = amt;
      } else if (pill) pill.remove();
    });
  };
  SicBo.roll = function () {
    if (this.busy) return;
    const total = Object.values(this.bets).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      PixelAudio.play('error');
      Casino.toast('Сначала сделайте ставку', 'bad');
      return;
    }
    this.busy = true;
    PixelAudio.resume();
    const dice = [1 + ((Math.random() * 6) | 0), 1 + ((Math.random() * 6) | 0), 1 + ((Math.random() * 6) | 0)];
    const dieEls = this.el.querySelectorAll('.sb-die');
    let frame = 0;
    const anim = setInterval(() => {
      dieEls.forEach((d) => (d.textContent = PIPS[1 + ((Math.random() * 6) | 0)]));
      PixelAudio.play('diceRoll');
      frame++;
      if (frame > 10) {
        clearInterval(anim);
        dieEls.forEach((d, i) => {
          d.textContent = PIPS[dice[i]];
          d.classList.add('settle');
          setTimeout(() => d.classList.remove('settle'), 400);
        });
        this.settle(dice);
      }
    }, 90);
  };
  SicBo.settle = function (dice) {
    const sum = dice[0] + dice[1] + dice[2];
    const counts = {};
    dice.forEach((d) => (counts[d] = (counts[d] || 0) + 1));
    const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
    this.el.querySelector('#sbResult').textContent = `${dice.map((d) => PIPS[d]).join(' ')} = ${sum}`;

    let payout = 0;
    for (const [key, amt] of Object.entries(this.bets)) {
      const [type, val] = key.split(':');
      if (type === 'small' && sum >= 4 && sum <= 10 && !isTriple) payout += amt * 2;
      else if (type === 'big' && sum >= 11 && sum <= 17 && !isTriple) payout += amt * 2;
      else if (type === 'anytriple' && isTriple) payout += amt * 31;
      else if (type === 'total' && parseInt(val) === sum) payout += amt * totalPay(sum);
      else if (type === 'triple' && isTriple && dice[0] === parseInt(val)) payout += amt * 180;
      else if (type === 'single') {
        const n = counts[parseInt(val)] || 0;
        if (n > 0) payout += amt * (n + 1); // 2x,3x,4x
      }
    }
    if (payout > 0) {
      Casino.win(payout);
      PixelAudio.play(payout > 500 ? 'jackpot' : payout > 200 ? 'bigWin' : 'win');
      Casino.confetti({ count: payout > 500 ? 140 : 70 });
      Casino.toast(`Сумма ${sum}! Выигрыш +${Casino.fmt(payout)} 🎉`, 'good');
    } else {
      PixelAudio.play('lose');
      Casino.toast(`Сумма ${sum}. Удачи в следующий раз`, 'bad');
    }
    this.bets = {};
    this.refresh();
    this.busy = false;
  };
  global.SicBo = SicBo;
})(window);
