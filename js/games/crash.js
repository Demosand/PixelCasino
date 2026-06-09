/* =====================================================================
 *  Crash — rising multiplier, cash out before it busts
 * ===================================================================== */
(function (global) {
  'use strict';

  const Crash = {
    el: null,
    bet: 50,
    state: 'idle', // idle | flying | crashed
    mult: 1,
    crashAt: 2,
    raf: null,
    startT: 0,
    cashedOut: false,
    canvas: null,
    ctx: null,
    history: [],
  };

  Crash.open = function (c) {
    this.el = c;
    this.bet = 50;
    this.state = 'idle';
    this.render();
  };

  Crash.genCrash = function () {
    // house edge ~3%: P(crash before x) ; instant-bust 3% of the time
    const r = Math.random();
    if (r < 0.03) return 1.0;
    const h = 0.97;
    return Math.max(1.01, Math.floor((h / (1 - r)) * 100) / 100);
  };

  Crash.render = function () {
    this.el.innerHTML = `
      <div class="crash-game">
        <div class="crash-stage">
          <canvas id="crashCanvas" width="640" height="340"></canvas>
          <div class="crash-mult" id="crashMult">1.00×</div>
          <div class="crash-status" id="crashStatus"></div>
        </div>
        <div class="crash-history" id="crashHistory"></div>
        <div class="crash-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка</span>
            <div class="stepper">
              <button class="st-btn" data-d="-25">−</button>
              <span class="st-val" id="crashBet">${this.bet}</span>
              <button class="st-btn" data-d="25">+</button>
            </div>
          </div>
          <button class="btn-spin crash-btn" id="crashBtn"><span>СТАРТ 🚀</span></button>
        </div>
      </div>`;

    this.canvas = this.el.querySelector('#crashCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.drawIdle();

    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.state === 'flying') return;
        PixelAudio.play('click');
        self.bet = Math.max(25, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#crashBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#crashBtn').addEventListener('click', () => self.action());
    this.renderHistory();
  };

  Crash.action = function () {
    if (this.state === 'idle' || this.state === 'crashed') this.start();
    else if (this.state === 'flying') this.cashOut();
  };

  Crash.start = function () {
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    this.state = 'flying';
    this.mult = 1;
    this.cashedOut = false;
    this.crashAt = this.genCrash();
    this.startT = performance.now();
    this.points = [];

    const btn = this.el.querySelector('#crashBtn');
    btn.classList.add('cashout');
    btn.querySelector('span').textContent = 'ЗАБРАТЬ';
    this.el.querySelector('#crashStatus').textContent = '';

    this._lastBeep = 0;
    this.fly();
  };

  Crash.fly = function () {
    const tick = (now) => {
      const t = (now - this.startT) / 1000;
      this.mult = Math.pow(1.0718, t * 8); // exponential growth
      this.mult = Math.floor(this.mult * 100) / 100;

      const mEl = this.el.querySelector('#crashMult');
      mEl.textContent = this.mult.toFixed(2) + '×';

      if (this.mult - this._lastBeep > 0.15) {
        PixelAudio.play('tick');
        this._lastBeep = this.mult;
      }

      this.draw(t);

      if (this.mult >= this.crashAt) {
        this.crash();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  Crash.cashOut = function () {
    if (this.state !== 'flying' || this.cashedOut) return;
    this.cashedOut = true;
    const win = Math.round(this.bet * this.mult);
    Casino.win(win);
    PixelAudio.play(this.mult >= 5 ? 'bigWin' : 'win');
    Casino.toast(`Забрано на ${this.mult.toFixed(2)}× → +${Casino.fmt(win)} 🎉`, 'good');
    Casino.confetti({ count: this.mult >= 5 ? 100 : 60 });
    const st = this.el.querySelector('#crashStatus');
    st.textContent = `+${Casino.fmt(win)}`;
    st.className = 'crash-status win';
    const btn = this.el.querySelector('#crashBtn');
    btn.classList.remove('cashout');
    btn.querySelector('span').textContent = 'СНОВА 🚀';
  };

  Crash.crash = function () {
    cancelAnimationFrame(this.raf);
    this.state = 'crashed';
    this.draw(0, true);
    const mEl = this.el.querySelector('#crashMult');
    mEl.textContent = this.mult.toFixed(2) + '×';
    mEl.classList.add('boom');
    setTimeout(() => mEl.classList.remove('boom'), 600);

    PixelAudio.play('lose');
    Casino.shake(this.el.querySelector('.crash-stage'), 1.5);

    if (!this.cashedOut) {
      const st = this.el.querySelector('#crashStatus');
      st.textContent = '💥 КРАШ!';
      st.className = 'crash-status lose';
    }
    this.history.unshift(this.mult);
    this.history = this.history.slice(0, 12);
    this.renderHistory();

    const btn = this.el.querySelector('#crashBtn');
    btn.classList.remove('cashout');
    btn.querySelector('span').textContent = 'СНОВА 🚀';
    this.state = 'idle';
  };

  Crash.drawIdle = function () {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 640, 340);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (340 / 6) * i);
      ctx.lineTo(640, (340 / 6) * i);
      ctx.stroke();
    }
  };

  Crash.draw = function (t, crashed) {
    const ctx = this.ctx;
    const W = 640,
      H = 340;
    ctx.clearRect(0, 0, W, H);
    this.drawIdle();

    // curve
    const maxM = Math.max(2, this.mult);
    ctx.beginPath();
    ctx.moveTo(0, H);
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const tt = (t * i) / steps;
      const m = Math.pow(1.0718, tt * 8);
      const x = (i / steps) * W * Math.min(1, t / Math.max(t, 1));
      const px = (i / steps) * W;
      const py = H - ((m - 1) / (maxM - 1)) * (H - 40);
      ctx.lineTo(px, Math.max(8, py));
    }
    ctx.strokeStyle = crashed ? '#ff3864' : '#3cf28d';
    ctx.lineWidth = 4;
    ctx.shadowColor = crashed ? '#ff3864' : '#3cf28d';
    ctx.shadowBlur = 16;
    ctx.stroke();

    // rocket dot
    const lastM = this.mult;
    const ex = W;
    const ey = H - ((lastM - 1) / (maxM - 1)) * (H - 40);
    ctx.shadowBlur = 0;
    ctx.font = '24px serif';
    ctx.fillText(crashed ? '💥' : '🚀', ex - 26, Math.max(24, ey));
  };

  Crash.renderHistory = function () {
    const wrap = this.el.querySelector('#crashHistory');
    if (!wrap) return;
    wrap.innerHTML = this.history
      .map((m) => {
        const cls = m >= 10 ? 'h-hot' : m >= 2 ? 'h-warm' : 'h-cool';
        return `<span class="h-pill ${cls}">${m.toFixed(2)}×</span>`;
      })
      .join('');
  };

  Crash.close = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
  };

  global.Crash = Crash;
})(window);
