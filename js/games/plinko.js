/* =====================================================================
 *  Plinko — canvas ball physics dropping through pegs into multiplier bins
 * ===================================================================== */
(function (global) {
  'use strict';

  const Plinko = {
    el: null,
    canvas: null,
    ctx: null,
    bet: 20,
    rows: 12,
    risk: 'mid',
    pegs: [],
    balls: [],
    bins: [],
    raf: null,
    W: 600,
    H: 620,
  };

  const PAYOUTS = {
    low: {
      12: [3, 1.6, 1.3, 1.1, 1, 0.7, 0.5, 0.7, 1, 1.1, 1.3, 1.6, 3],
    },
    mid: {
      12: [12, 4, 1.8, 1.2, 0.9, 0.6, 0.3, 0.6, 0.9, 1.2, 1.8, 4, 12],
    },
    high: {
      12: [40, 9, 3, 1.4, 0.6, 0.3, 0.1, 0.3, 0.6, 1.4, 3, 9, 40],
    },
  };

  Plinko.open = function (container) {
    this.el = container;
    this.bet = 20;
    this.balls = [];
    this.render();
  };

  Plinko.render = function () {
    this.el.innerHTML = `
      <div class="plinko">
        <div class="pk-stage">
          <canvas id="pkCanvas" width="${this.W}" height="${this.H}"></canvas>
          <div class="pk-bins" id="pkBins"></div>
        </div>
        <div class="pk-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка</span>
            <div class="stepper">
              <button class="st-btn" data-d="-10">−</button>
              <span class="st-val" id="pkBet">${this.bet}</span>
              <button class="st-btn" data-d="10">+</button>
            </div>
          </div>
          <div class="ctl-group">
            <span class="ctl-label">Риск</span>
            <div class="risk-tabs" id="pkRisk">
              <button data-risk="low">Низкий</button>
              <button data-risk="mid" class="on">Средний</button>
              <button data-risk="high">Высокий</button>
            </div>
          </div>
          <button class="btn-spin" id="pkDrop"><span>БРОСИТЬ ⚪</span></button>
        </div>
      </div>`;

    this.canvas = this.el.querySelector('#pkCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.buildPegs();
    this.renderBins();
    this.bind();
    this.loop();
  };

  Plinko.buildPegs = function () {
    this.pegs = [];
    const rows = this.rows;
    const top = 70;
    const gapY = (this.H - top - 90) / rows;
    for (let r = 0; r < rows; r++) {
      const count = r + 3;
      const gapX = 36;
      const width = (count - 1) * gapX;
      const startX = this.W / 2 - width / 2;
      for (let c = 0; c < count; c++) {
        this.pegs.push({ x: startX + c * gapX, y: top + r * gapY, r: 5 });
      }
    }
    this.binCount = PAYOUTS[this.risk][this.rows].length;
  };

  Plinko.renderBins = function () {
    const pays = PAYOUTS[this.risk][this.rows];
    const wrap = this.el.querySelector('#pkBins');
    wrap.innerHTML = pays
      .map((p, i) => {
        const heat = p >= 5 ? 'hot' : p >= 1 ? 'warm' : 'cool';
        return `<div class="pk-bin ${heat}" data-i="${i}">${p}×</div>`;
      })
      .join('');
  };

  Plinko.bind = function () {
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(500, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#pkBet').textContent = self.bet;
      })
    );
    this.el.querySelectorAll('[data-risk]').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.risk = b.dataset.risk;
        self.el.querySelectorAll('[data-risk]').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        self.binCount = PAYOUTS[self.risk][self.rows].length;
        self.renderBins();
      })
    );
    this.el.querySelector('#pkDrop').addEventListener('click', () => self.drop());
  };

  Plinko.drop = function () {
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    PixelAudio.play('drop');
    this.balls.push({
      x: this.W / 2 + (Math.random() - 0.5) * 8,
      y: 30,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 0,
      r: 8,
      bet: this.bet,
      done: false,
    });
  };

  Plinko.loop = function () {
    const ctx = this.ctx;
    const draw = () => {
      ctx.clearRect(0, 0, this.W, this.H);

      // pegs
      ctx.fillStyle = '#cfd6ff';
      this.pegs.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // physics
      const grav = 0.28;
      const binTop = this.H - 70;
      for (const b of this.balls) {
        if (b.done) continue;
        b.vy += grav;
        b.x += b.vx;
        b.y += b.vy;

        for (const p of this.pegs) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const dist = Math.hypot(dx, dy);
          const min = b.r + p.r;
          if (dist < min && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = min - dist;
            b.x += nx * overlap;
            b.y += ny * overlap;
            const dot = b.vx * nx + b.vy * ny;
            b.vx = (b.vx - 2 * dot * nx) * 0.55 + (Math.random() - 0.5) * 1.4;
            b.vy = (b.vy - 2 * dot * ny) * 0.55;
            if (Math.abs(dot) > 1) PixelAudio.play('peg');
          }
        }

        // walls
        if (b.x < b.r) {
          b.x = b.r;
          b.vx *= -0.5;
        }
        if (b.x > this.W - b.r) {
          b.x = this.W - b.r;
          b.vx *= -0.5;
        }

        if (b.y >= binTop) {
          b.done = true;
          this.land(b);
        }

        // draw ball
        ctx.beginPath();
        ctx.fillStyle = '#ffd23f';
        ctx.shadowColor = '#ffd23f';
        ctx.shadowBlur = 12;
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      this.balls = this.balls.filter((b) => !b.done || b._keep);
      this.raf = requestAnimationFrame(draw);
    };
    draw();
  };

  Plinko.land = function (b) {
    const pays = PAYOUTS[this.risk][this.rows];
    const binW = this.W / pays.length;
    let idx = Math.floor(b.x / binW);
    idx = Math.max(0, Math.min(pays.length - 1, idx));
    const mult = pays[idx];
    const win = Math.round(b.bet * mult);

    const binEl = this.el.querySelector(`.pk-bin[data-i="${idx}"]`);
    if (binEl) {
      binEl.classList.add('hit');
      setTimeout(() => binEl.classList.remove('hit'), 400);
    }

    if (win > 0) {
      Casino.win(win);
      if (mult >= 5) {
        PixelAudio.play('bigWin');
        Casino.confetti({ count: 80 });
        Casino.toast(`${mult}× → +${Casino.fmt(win)} 🔥`, 'good');
      } else if (mult >= 1) {
        PixelAudio.play('win');
      } else {
        PixelAudio.play('coin');
      }
    } else {
      PixelAudio.play('lose');
    }
  };

  Plinko.close = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.balls = [];
  };

  global.Plinko = Plinko;
})(window);
