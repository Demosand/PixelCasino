/* =====================================================================
 *  Horse Race — pick a horse, watch the animated race, win by odds
 * ===================================================================== */
(function (global) {
  'use strict';

  const HORSES = [
    { name: 'Молния', emoji: '🐎', color: '#2de2e6', odds: 2.5 },
    { name: 'Гром', emoji: '🐴', color: '#ff3864', odds: 3.5 },
    { name: 'Вихрь', emoji: '🐎', color: '#3cf28d', odds: 4.5 },
    { name: 'Комета', emoji: '🐴', color: '#ffd23f', odds: 6 },
    { name: 'Тень', emoji: '🐎', color: '#a44cff', odds: 9 },
  ];

  const Horse = {
    el: null,
    bet: 30,
    pick: 0,
    racing: false,
    raf: null,
  };
  Horse.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.pick = 0;
    this.racing = false;
    this.render();
  };
  Horse.render = function () {
    const lanes = HORSES.map(
      (h, i) => `
      <div class="hr-lane" data-i="${i}">
        <div class="hr-meta"><span class="hr-name" style="color:${h.color}">${h.name}</span><span class="hr-odds">${h.odds}×</span></div>
        <div class="hr-track">
          <div class="hr-finish"></div>
          <div class="hr-runner" id="hrRunner${i}" style="filter:drop-shadow(0 0 6px ${h.color})">${h.emoji}</div>
        </div>
      </div>`
    ).join('');
    this.el.innerHTML = `
      <div class="horse">
        <div class="hr-board">${lanes}</div>
        <div class="hr-result" id="hrResult">Выберите лошадь</div>
        <div class="hr-picks" id="hrPicks">
          ${HORSES.map((h, i) => `<button class="hr-pick ${i === 0 ? 'on' : ''}" data-pick="${i}" style="--hc:${h.color}">${h.emoji} ${h.name}<small>${h.odds}×</small></button>`).join('')}
        </div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="hrBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="hrGo"><span>СТАРТ 🏁</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.racing) return;
        PixelAudio.play('chip');
        self.pick = parseInt(b.dataset.pick);
        self.el.querySelectorAll('.hr-pick').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      })
    );
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.racing) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#hrBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#hrGo').addEventListener('click', () => self.start());
  };
  Horse.start = function () {
    if (this.racing) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.racing = true;
    PixelAudio.resume();
    PixelAudio.play('whistle');
    this.el.querySelector('#hrResult').textContent = 'И они помчались! 🏇';
    this.el.querySelector('#hrResult').className = 'hr-result';

    // Pre-decide the winner fairly: chance ∝ 1/odds (with house edge baked in
    // by the odds themselves). Every horse can win, favourites just win more often.
    const weights = HORSES.map((h) => 1 / h.odds);
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    let winnerIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { winnerIdx = i; break; }
    }

    // Race animation: everyone runs with jitter and rubber-banding so the lead
    // keeps changing, but the chosen winner gets a late surge and crosses first.
    const pos = HORSES.map(() => 0);
    const base = HORSES.map(() => 0.55 + Math.random() * 0.25);
    const runners = HORSES.map((_, i) => this.el.querySelector('#hrRunner' + i));
    const raceDur = 4200 + Math.random() * 1200;
    let startT = 0;
    let finished = false;
    let lastHoof = 0;

    const tick = (now) => {
      if (finished) return;
      if (!startT) startT = now;
      const t = Math.min(1, (now - startT) / raceDur);
      for (let i = 0; i < HORSES.length; i++) {
        let v = base[i] * (0.7 + Math.random() * 1.0);
        // rubber-band: trailing horses speed up a touch, leaders ease off
        const avg = pos.reduce((a, b) => a + b, 0) / pos.length;
        v *= 1 + (avg - pos[i]) * 0.012;
        // winner surges in the final third; others fade slightly near the line
        if (i === winnerIdx) v *= 1 + t * t * 0.9;
        else if (t > 0.75 && pos[i] > pos[winnerIdx]) v *= 0.55;
        pos[i] += v;
        runners[i].style.left = Math.min(96, pos[i]) + '%';
      }
      if (now - lastHoof > 110) {
        PixelAudio.play('hoof');
        lastHoof = now;
      }
      if (pos[winnerIdx] >= 96) {
        finished = true;
        this.finish(winnerIdx);
        return;
      }
      // safety: nobody else may visually finish before the winner
      for (let i = 0; i < pos.length; i++) if (i !== winnerIdx) pos[i] = Math.min(pos[i], 94.5);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };
  Horse.finish = function (winner) {
    const h = HORSES[winner];
    const res = this.el.querySelector('#hrResult');
    this.el.querySelector('#hrRunner' + winner).classList.add('hr-win');
    if (winner === this.pick) {
      const payout = Math.round(this.bet * h.odds);
      Casino.win(payout);
      res.textContent = `🏆 ${h.name} побеждает! +${Casino.fmt(payout)}`;
      res.className = 'hr-result win';
      PixelAudio.play(h.odds >= 6 ? 'jackpot' : 'bigWin');
      Casino.confetti({ count: h.odds >= 6 ? 150 : 90 });
    } else {
      res.textContent = `🏁 Победила «${h.name}». Вы ставили на «${HORSES[this.pick].name}»`;
      res.className = 'hr-result lose';
      PixelAudio.play('lose');
    }
    this.racing = false;
  };
  Horse.close = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
  };
  global.Horse = Horse;
})(window);
