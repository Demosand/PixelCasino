/* =====================================================================
 *  Wheel of Fortune — weighted segments, smooth spin, big multipliers
 * ===================================================================== */
(function (global) {
  'use strict';

  const SEGMENTS = [
    { m: 0, w: 30, color: '#3a3f5c' },
    { m: 1.5, w: 22, color: '#2de2e6' },
    { m: 2, w: 16, color: '#3cf28d' },
    { m: 3, w: 12, color: '#ffd23f' },
    { m: 5, w: 8, color: '#ff8e3c' },
    { m: 10, w: 5, color: '#ff3864' },
    { m: 25, w: 3, color: '#a44cff' },
    { m: 50, w: 1, color: '#ff2d95' },
  ];

  // expand into many visual segments for a nicer wheel
  function buildLayout() {
    const layout = [];
    const pattern = [0, 1, 2, 0, 1, 3, 0, 1, 2, 5, 0, 1, 2, 0, 1, 4, 0, 1, 2, 3, 0, 1, 10, 0, 1, 2, 0, 4, 25, 0, 1, 3, 0, 1, 2, 50];
    pattern.forEach((m) => {
      const seg = SEGMENTS.find((s) => s.m === m) || SEGMENTS[0];
      layout.push(seg);
    });
    return layout;
  }

  const Wheel = {
    el: null,
    bet: 50,
    angle: 0,
    spinning: false,
    layout: [],
  };

  Wheel.open = function (c) {
    this.el = c;
    this.bet = 50;
    this.angle = 0;
    this.layout = buildLayout();
    this.render();
  };

  Wheel.render = function () {
    const n = this.layout.length;
    const seg = 360 / n;
    const grad = this.layout
      .map((s, i) => `${s.color} ${i * seg}deg ${(i + 1) * seg}deg`)
      .join(', ');

    const labels = this.layout
      .map((s, i) => {
        if (s.m === 0) return '';
        const a = i * seg + seg / 2;
        return `<div class="wheel-label" style="transform:rotate(${a}deg)"><span style="transform:rotate(${-a}deg)">${s.m}×</span></div>`;
      })
      .join('');

    this.el.innerHTML = `
      <div class="wheel-game">
        <div class="wheel-wrap">
          <div class="wheel-pointer">▼</div>
          <div class="wheel" id="wheel" style="background:conic-gradient(${grad})">${labels}</div>
          <div class="wheel-center" id="wheelCenter">SPIN</div>
        </div>
        <div class="wheel-result" id="wheelResult">Крутите колесо удачи!</div>
        <div class="dice-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка</span>
            <div class="stepper">
              <button class="st-btn" data-d="-25">−</button>
              <span class="st-val" id="wheelBet">${this.bet}</span>
              <button class="st-btn" data-d="25">+</button>
            </div>
          </div>
          <button class="btn-spin" id="wheelSpin"><span>КРУТИТЬ 🎡</span></button>
        </div>
      </div>`;

    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.bet = Math.max(25, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#wheelBet').textContent = self.bet;
      })
    );
    const go = () => self.spin();
    this.el.querySelector('#wheelSpin').addEventListener('click', go);
    this.el.querySelector('#wheelCenter').addEventListener('click', go);
  };

  Wheel.pick = function () {
    // weighted choice among unique multipliers, then a random matching segment
    const total = SEGMENTS.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    let chosen = SEGMENTS[0];
    for (const s of SEGMENTS) {
      r -= s.w;
      if (r <= 0) {
        chosen = s;
        break;
      }
    }
    const idxs = this.layout.map((s, i) => (s.m === chosen.m ? i : -1)).filter((i) => i >= 0);
    const idx = idxs[(Math.random() * idxs.length) | 0];
    return { seg: chosen, idx };
  };

  Wheel.spin = function () {
    if (this.spinning) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.spinning = true;
    PixelAudio.resume();
    PixelAudio.play('spin');

    const { seg, idx } = this.pick();
    const n = this.layout.length;
    const segAng = 360 / n;
    const spins = 6;
    const target = 360 - (idx * segAng + segAng / 2);
    this.angle += spins * 360 + (target - (this.angle % 360) + 360) % 360;

    const wheel = this.el.querySelector('#wheel');
    wheel.style.transition = 'transform 5s cubic-bezier(.1,.7,.1,1)';
    wheel.style.transform = `rotate(${this.angle}deg)`;

    const tk = setInterval(() => PixelAudio.play('reelTick'), 110);
    const res = this.el.querySelector('#wheelResult');
    res.textContent = '…';

    setTimeout(() => {
      clearInterval(tk);
      this.settle(seg);
    }, 5100);
  };

  Wheel.settle = function (seg) {
    const res = this.el.querySelector('#wheelResult');
    const win = Math.round(this.bet * seg.m);
    if (win > 0) {
      Casino.win(win);
      res.textContent = `${seg.m}× → +${Casino.fmt(win)} 🎉`;
      res.style.color = seg.color;
      PixelAudio.play(seg.m >= 10 ? 'jackpot' : seg.m >= 3 ? 'bigWin' : 'win');
      Casino.confetti({ count: seg.m >= 10 ? 160 : 80 });
      if (seg.m >= 25) Casino.shake(this.el.querySelector('.wheel-wrap'), 2);
    } else {
      res.textContent = 'Пусто 😔 Попробуйте ещё';
      res.style.color = '';
      PixelAudio.play('lose');
    }
    this.spinning = false;
  };

  global.Wheel = Wheel;
})(window);
