/* =====================================================================
 *  Darts — throw 3 darts, payout scales with the total score
 * ===================================================================== */
(function (global) {
  'use strict';

  // ring: score, probability weight, label, radius% on the board
  const RINGS = [
    { score: 50, w: 5, name: 'Яблочко', r: 7 },
    { score: 25, w: 10, name: 'Центр', r: 16 },
    { score: 20, w: 20, name: 'Внутр. кольцо', r: 32 },
    { score: 10, w: 30, name: 'Внешн. кольцо', r: 46 },
    { score: 0, w: 35, name: 'Мимо', r: 60 },
  ];
  const DIVISOR = 38; // multiplier = total / DIVISOR  → RTP ≈ 95%

  const Darts = { el: null, bet: 30, throwing: false };

  Darts.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.throwing = false;
    this.render();
  };

  function throwOne() {
    const total = RINGS.reduce((s, r) => s + r.w, 0);
    let x = Math.random() * total;
    for (const r of RINGS) { x -= r.w; if (x <= 0) return r; }
    return RINGS[RINGS.length - 1];
  }

  Darts.render = function () {
    this.el.innerHTML = `
      <div class="darts">
        <div class="dt-stage">
          <div class="dt-board" id="dtBoard">
            <div class="dt-ring dt-r4"></div>
            <div class="dt-ring dt-r3"></div>
            <div class="dt-ring dt-r2"></div>
            <div class="dt-ring dt-r1"></div>
            <div class="dt-bull"></div>
          </div>
        </div>
        <div class="dt-score" id="dtScore">Брось 3 дротика — чем ближе к центру, тем больше</div>
        <div class="dt-legend">${RINGS.filter(r => r.score).map(r => `<span>${r.name}: <b>${r.score}</b></span>`).join('')}</div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="dtBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="dtGo"><span>БРОСОК 🎯</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.throwing) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#dtBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#dtGo').addEventListener('click', () => self.throw());
  };

  Darts.throw = function () {
    if (this.throwing) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.throwing = true;
    PixelAudio.resume();
    const board = this.el.querySelector('#dtBoard');
    board.querySelectorAll('.dt-dart').forEach((d) => d.remove());
    const scoreEl = this.el.querySelector('#dtScore');
    scoreEl.textContent = 'Бросаем...';
    scoreEl.className = 'dt-score';

    const hits = [throwOne(), throwOne(), throwOne()];
    hits.forEach((hit, i) => {
      setTimeout(() => {
        PixelAudio.play('drop');
        // place dart at a random angle on its ring
        const ang = Math.random() * Math.PI * 2;
        const rad = hit.score === 0 ? 52 + Math.random() * 6 : Math.max(2, hit.r - 4 + Math.random() * 6);
        const dart = document.createElement('div');
        dart.className = 'dt-dart';
        dart.textContent = '📍';
        dart.style.left = 50 + Math.cos(ang) * rad + '%';
        dart.style.top = 50 + Math.sin(ang) * rad + '%';
        board.appendChild(dart);
        setTimeout(() => PixelAudio.play(hit.score >= 25 ? 'kenoHit' : 'cupDown'), 60);
        scoreEl.textContent = hits.slice(0, i + 1).map((h) => h.score).join(' + ');
      }, 500 + i * 750);
    });

    setTimeout(() => {
      const total = hits.reduce((s, h) => s + h.score, 0);
      const mult = Math.round((total / DIVISOR) * 100) / 100;
      const payout = Math.round(this.bet * mult);
      if (payout > 0) {
        Casino.win(payout);
        scoreEl.textContent = `Σ ${total} очков · ${mult}× → +${Casino.fmt(payout)} 🎉`;
        scoreEl.className = 'dt-score win';
        PixelAudio.play(mult >= 2.5 ? 'bigWin' : 'win');
        if (mult >= 2.5) Casino.confetti({ count: 120 });
      } else {
        scoreEl.textContent = 'Все мимо 😔 Попробуй ещё';
        scoreEl.className = 'dt-score lose';
        PixelAudio.play('lose');
      }
      this.throwing = false;
    }, 500 + 3 * 750 + 300);
  };

  global.Darts = Darts;
})(window);
