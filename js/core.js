/* =====================================================================
 *  Casino core: wallet (virtual credits), persistence, UI helpers,
 *  toasts, confetti, router. Namespace: Casino
 * ===================================================================== */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'pixelCasino.v1';

  const Casino = {
    state: {
      balance: 1000,
      bestWin: 0,
      totalWagered: 0,
      totalWon: 0,
      spins: 0,
      level: 1,
      xp: 0,
    },
    listeners: [],
  };

  /* ---------------- persistence ---------------- */
  Casino.load = function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(this.state, JSON.parse(raw));
    } catch (e) {
      /* ignore */
    }
    if (this.state.balance <= 0) this.state.balance = 0;
  };

  Casino.save = function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      /* ignore */
    }
  };

  Casino.reset = function () {
    this.state = { balance: 1000, bestWin: 0, totalWagered: 0, totalWon: 0, spins: 0, level: 1, xp: 0 };
    this.save();
    this.emit();
  };

  /* ---------------- balance ops ---------------- */
  Casino.canBet = function (amount) {
    return amount > 0 && this.state.balance >= amount;
  };

  Casino.bet = function (amount) {
    if (!this.canBet(amount)) return false;
    this.state.balance -= amount;
    this.state.totalWagered += amount;
    this.addXp(Math.max(1, Math.floor(amount / 10)));
    this.emit();
    this.save();
    return true;
  };

  Casino.win = function (amount) {
    if (amount <= 0) return;
    this.state.balance += amount;
    this.state.totalWon += amount;
    if (amount > this.state.bestWin) this.state.bestWin = amount;
    this.emit();
    this.save();
  };

  Casino.addBalance = function (amount) {
    this.state.balance += amount;
    this.emit();
    this.save();
  };

  Casino.addXp = function (n) {
    this.state.xp += n;
    const need = this.state.level * 100;
    if (this.state.xp >= need) {
      this.state.xp -= need;
      this.state.level++;
      const bonus = this.state.level * 50;
      this.state.balance += bonus;
      PixelAudio.play('levelUp');
      Casino.toast(`⭐ Уровень ${this.state.level}! Бонус +${bonus}`, 'gold');
      Casino.confetti();
    }
  };

  /* ---------------- pub/sub ---------------- */
  Casino.onChange = function (fn) {
    this.listeners.push(fn);
  };
  Casino.emit = function () {
    this.listeners.forEach((fn) => fn(this.state));
  };

  /* ---------------- formatting ---------------- */
  Casino.fmt = function (n) {
    return Math.round(n).toLocaleString('ru-RU');
  };

  /* ---------------- animated number ---------------- */
  Casino.animateNumber = function (el, from, to, dur) {
    dur = dur || 600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * eased;
      el.textContent = Casino.fmt(val);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = Casino.fmt(to);
    };
    requestAnimationFrame(step);
  };

  /* ---------------- toast ---------------- */
  Casino.toast = function (msg, type) {
    const wrap = document.getElementById('toasts');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 2600);
  };

  /* ---------------- confetti / particles ---------------- */
  Casino.confetti = function (opts) {
    opts = opts || {};
    const count = opts.count || 90;
    const canvas = document.getElementById('fx-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const colors = ['#ffd23f', '#ff3864', '#2de2e6', '#a44cff', '#3cf28d', '#ff8e3c'];
    const parts = [];
    const ox = opts.x != null ? opts.x : innerWidth / 2;
    const oy = opts.y != null ? opts.y : innerHeight / 2;
    for (let i = 0; i < count; i++) {
      parts.push({
        x: ox,
        y: oy,
        vx: (Math.random() - 0.5) * 16,
        vy: Math.random() * -16 - 4,
        size: 4 + Math.random() * 6,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        life: 1,
      });
    }
    let running = true;
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      parts.forEach((p) => {
        p.vy += 0.5;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.012;
        if (p.life > 0 && p.y < canvas.height + 40) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      if (alive) requestAnimationFrame(tick);
      else {
        running = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(tick);
  };

  /* coin burst from a point */
  Casino.coinBurst = function (x, y) {
    const layer = document.getElementById('fx-coins');
    if (!layer) return;
    for (let i = 0; i < 14; i++) {
      const c = document.createElement('div');
      c.className = 'fx-coin';
      c.textContent = '🪙';
      c.style.left = x + 'px';
      c.style.top = y + 'px';
      const dx = (Math.random() - 0.5) * 280;
      const dy = -120 - Math.random() * 220;
      c.style.setProperty('--dx', dx + 'px');
      c.style.setProperty('--dy', dy + 'px');
      c.style.animationDelay = Math.random() * 0.15 + 's';
      layer.appendChild(c);
      setTimeout(() => c.remove(), 1300);
    }
  };

  /* ---------------- screen shake ---------------- */
  Casino.shake = function (el, intensity) {
    intensity = intensity || 1;
    el.style.setProperty('--shake', intensity);
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  };

  global.Casino = Casino;
})(window);
