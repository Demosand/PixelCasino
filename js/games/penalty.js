/* =====================================================================
 *  Penalty — pick a corner, beat the keeper. Goal pays 1.55×.
 *  Keeper covers 2 of 5 zones → 60% goal chance (RTP ≈ 93%).
 * ===================================================================== */
(function (global) {
  'use strict';

  const ZONES = ['↖', '↗', '⬆', '↙', '↘'];

  const Penalty = { el: null, bet: 30, kicking: false, streak: 0 };

  Penalty.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.kicking = false;
    this.streak = 0;
    this.render();
  };

  Penalty.render = function () {
    this.el.innerHTML = `
      <div class="pen">
        <div class="pen-goal">
          <div class="pen-net"></div>
          <div class="pen-keeper" id="penKeeper">🧤</div>
          <div class="pen-ball" id="penBall">⚽</div>
          ${ZONES.map((z, i) => `<button class="pen-zone pen-z${i}" data-z="${i}" title="Бить ${z}">${z}</button>`).join('')}
        </div>
        <div class="pen-msg" id="penMsg">Выбери угол и бей! · Гол платит 1.55×</div>
        <div class="pen-streak" id="penStreak"></div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="penBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.kicking) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#penBet').textContent = self.bet;
      })
    );
    this.el.querySelectorAll('.pen-zone').forEach((b) =>
      b.addEventListener('click', () => self.kick(parseInt(b.dataset.z)))
    );
  };

  Penalty.kick = function (zone) {
    if (this.kicking) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.kicking = true;
    PixelAudio.resume();
    PixelAudio.play('whistle');
    const msg = this.el.querySelector('#penMsg');
    msg.textContent = 'Разбег...';
    msg.className = 'pen-msg';

    // keeper covers 2 distinct zones
    const covered = [];
    while (covered.length < 2) {
      const z = Math.floor(Math.random() * 5);
      if (!covered.includes(z)) covered.push(z);
    }
    const saved = covered.includes(zone);

    const ball = this.el.querySelector('#penBall');
    const keeper = this.el.querySelector('#penKeeper');
    const zoneEl = this.el.querySelector('.pen-z' + zone);
    const keeperEl = this.el.querySelector('.pen-z' + covered[0]);

    setTimeout(() => {
      PixelAudio.play('drop');
      // fly the ball to the chosen zone, keeper dives to his first zone
      const fly = (el, target) => {
        const gr = el.parentElement.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        el.style.transition = 'left .45s cubic-bezier(.3,.6,.4,1), top .45s cubic-bezier(.3,.6,.4,1), transform .45s';
        el.style.left = ((tr.left + tr.width / 2 - gr.left) / gr.width) * 100 + '%';
        el.style.top = ((tr.top + tr.height / 2 - gr.top) / gr.height) * 100 + '%';
      };
      fly(ball, saved ? this.el.querySelector('.pen-z' + zone) : zoneEl);
      fly(keeper, saved ? zoneEl : keeperEl);
      keeper.style.transform = 'translate(-50%,-50%) rotate(' + (zone < 2 ? -30 : 30) + 'deg)';
    }, 600);

    setTimeout(() => {
      if (!saved) {
        this.streak++;
        const payout = Math.round(this.bet * 1.55);
        Casino.win(payout);
        msg.textContent = `⚽ ГОООЛ! +${Casino.fmt(payout)}`;
        msg.className = 'pen-msg win';
        PixelAudio.play(this.streak >= 3 ? 'bigWin' : 'win');
        Casino.confetti({ count: this.streak >= 3 ? 120 : 60 });
      } else {
        this.streak = 0;
        msg.textContent = '🧤 Вратарь тащит! Сейв';
        msg.className = 'pen-msg lose';
        PixelAudio.play('lose');
      }
      this.el.querySelector('#penStreak').textContent = this.streak > 1 ? `🔥 Серия голов: ${this.streak}` : '';
      // reset positions
      const ballEl = this.el.querySelector('#penBall');
      const kEl = this.el.querySelector('#penKeeper');
      setTimeout(() => {
        [ballEl, kEl].forEach((el) => { el.style.transition = 'left .3s, top .3s, transform .3s'; el.style.left = ''; el.style.top = ''; el.style.transform = ''; });
        this.kicking = false;
      }, 900);
    }, 1150);
  };

  global.Penalty = Penalty;
})(window);
