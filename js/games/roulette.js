/* =====================================================================
 *  European Roulette — single zero, spinning wheel + chip betting board
 * ===================================================================== */
(function (global) {
  'use strict';

  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

  const Roulette = {
    el: null,
    chip: 10,
    bets: {}, // key -> amount
    spinning: false,
    angle: 0,
  };

  function colorOf(n) {
    if (n === 0) return 'green';
    return RED.has(n) ? 'red' : 'black';
  }

  Roulette.open = function (container) {
    this.el = container;
    this.bets = {};
    this.chip = 10;
    this.angle = 0;
    this.render();
  };

  Roulette.render = function () {
    let board = '';
    // zero
    board += `<button class="rb rb-zero ${'green'}" data-bet="n:0">0</button>`;
    // numbers 1..36 in 3 rows (columns top→bottom standard layout)
    for (let row = 2; row >= 0; row--) {
      for (let col = 0; col < 12; col++) {
        const n = col * 3 + row + 1;
        board += `<button class="rb num ${colorOf(n)}" data-bet="n:${n}">${n}</button>`;
      }
    }

    const outside = `
      <div class="r-outside">
        <button class="rb out" data-bet="dozen:1">1-12</button>
        <button class="rb out" data-bet="dozen:2">13-24</button>
        <button class="rb out" data-bet="dozen:3">25-36</button>
        <button class="rb out" data-bet="half:lo">1-18</button>
        <button class="rb out red" data-bet="color:red">КРАСНОЕ</button>
        <button class="rb out black" data-bet="color:black">ЧЁРНОЕ</button>
        <button class="rb out" data-bet="parity:even">ЧЁТ</button>
        <button class="rb out" data-bet="parity:odd">НЕЧЕТ</button>
        <button class="rb out" data-bet="half:hi">19-36</button>
      </div>`;

    this.el.innerHTML = `
      <div class="roulette">
        <div class="r-stage">
          <div class="r-wheel-wrap">
            <div class="r-pointer">▼</div>
            <div class="r-wheel" id="rwheel" style="background:conic-gradient(${this.wheelGradient()})">${this.buildWheel()}</div>
            <div class="r-ball" id="rball"></div>
            <div class="r-hub"></div>
          </div>
          <div class="r-result" id="rResult">Делайте ставки</div>
        </div>
        <div class="r-board-wrap">
          <div class="r-board">${board}</div>
          ${outside}
          <div class="r-chips">
            <span class="ctl-label">Фишка:</span>
            ${[5, 10, 25, 100].map((v) => `<button class="chipbtn ${v === 10 ? 'on' : ''}" data-chip="${v}">${v}</button>`).join('')}
            <button class="btn-clear" id="rClear">Очистить</button>
            <span class="r-totalbet">Ставка: <b id="rTotal">0</b></span>
            <button class="btn-spin r-spin" id="rSpin"><span>ЗАПУСК</span></button>
          </div>
        </div>
      </div>`;

    this.bind();
  };

  Roulette.wheelGradient = function () {
    const seg = 360 / ORDER.length;
    const map = { red: '#c0182f', black: '#16161f', green: '#1f8a4c' };
    return ORDER.map((n, i) => `${map[colorOf(n)]} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ');
  };

  Roulette.buildWheel = function () {
    const seg = 360 / ORDER.length;
    return ORDER.map((n, i) => {
      const a = i * seg + seg / 2;
      return `<div class="r-numlabel" style="transform:rotate(${a}deg)"><span style="transform:rotate(${-a}deg)">${n}</span></div>`;
    }).join('');
  };

  Roulette.bind = function () {
    const self = this;
    this.el.querySelectorAll('[data-bet]').forEach((b) => {
      b.addEventListener('click', () => self.placeBet(b));
    });
    this.el.querySelectorAll('[data-chip]').forEach((b) => {
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.chip = parseInt(b.dataset.chip);
        self.el.querySelectorAll('.chipbtn').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      });
    });
    this.el.querySelector('#rClear').addEventListener('click', () => {
      PixelAudio.play('click');
      self.bets = {};
      self.refreshBoard();
    });
    this.el.querySelector('#rSpin').addEventListener('click', () => self.spin());
  };

  Roulette.placeBet = function (btn) {
    if (this.spinning) return;
    const key = btn.dataset.bet;
    const cur = this.bets[key] || 0;
    if (!Casino.canBet(this.chip)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    Casino.bet(this.chip);
    this.bets[key] = cur + this.chip;
    PixelAudio.play('chip');
    this.refreshBoard();
  };

  Roulette.refreshBoard = function () {
    let total = 0;
    Object.values(this.bets).forEach((v) => (total += v));
    this.el.querySelector('#rTotal').textContent = Casino.fmt(total);
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

  Roulette.spin = function () {
    if (this.spinning) return;
    const total = Object.values(this.bets).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      PixelAudio.play('error');
      Casino.toast('Сначала сделайте ставку', 'bad');
      return;
    }
    this.spinning = true;
    PixelAudio.resume();
    PixelAudio.play('rouletteRoll');

    const result = ORDER[(Math.random() * ORDER.length) | 0];
    const idx = ORDER.indexOf(result);
    const seg = 360 / ORDER.length;
    const spins = 6;
    // wheel spins, target lands under top pointer
    this.angle += spins * 360 + (360 - idx * seg) - (this.angle % 360);
    const wheel = this.el.querySelector('#rwheel');
    wheel.style.transition = 'transform 5s cubic-bezier(.12,.7,.12,1)';
    wheel.style.transform = `rotate(${this.angle}deg)`;

    const ball = this.el.querySelector('#rball');
    ball.style.transition = 'transform 5s cubic-bezier(.2,.6,.1,1)';
    ball.style.transform = `rotate(${-(spins + 2) * 360}deg)`;

    // ticking
    const ticker = setInterval(() => PixelAudio.play('reelTick'), 90);

    const res = this.el.querySelector('#rResult');
    res.textContent = '…';
    res.className = 'r-result spinning';

    setTimeout(() => {
      clearInterval(ticker);
      this.settle(result);
    }, 5100);
  };

  Roulette.settle = function (n) {
    const col = colorOf(n);
    const res = this.el.querySelector('#rResult');
    res.className = 'r-result ' + col;
    res.textContent = `${n} ${col === 'red' ? '🔴' : col === 'black' ? '⚫' : '🟢'}`;

    let payout = 0;
    for (const [key, amt] of Object.entries(this.bets)) {
      const [type, val] = key.split(':');
      let win = 0;
      if (type === 'n' && parseInt(val) === n) win = amt * 36;
      else if (type === 'color' && val === col) win = amt * 2;
      else if (type === 'parity' && n !== 0) {
        if ((val === 'even' && n % 2 === 0) || (val === 'odd' && n % 2 === 1)) win = amt * 2;
      } else if (type === 'half' && n !== 0) {
        if ((val === 'lo' && n <= 18) || (val === 'hi' && n >= 19)) win = amt * 2;
      } else if (type === 'dozen' && n !== 0) {
        const d = Math.ceil(n / 12);
        if (parseInt(val) === d) win = amt * 3;
      }
      payout += win;
    }

    if (payout > 0) {
      Casino.win(payout);
      PixelAudio.play(payout > 500 ? 'bigWin' : 'win');
      Casino.toast(`Выпало ${n}! Выигрыш +${Casino.fmt(payout)} 🎉`, 'good');
      Casino.confetti({ count: payout > 500 ? 120 : 70 });
    } else {
      PixelAudio.play('lose');
      Casino.toast(`Выпало ${n}. Удачи в следующий раз`, 'bad');
    }

    this.bets = {};
    this.refreshBoard();
    this.spinning = false;
  };

  global.Roulette = Roulette;
})(window);
