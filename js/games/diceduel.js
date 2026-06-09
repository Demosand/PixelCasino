/* =====================================================================
 *  Dice Duel — your 2 dice vs the dealer's. Higher total wins 2×,
 *  a tie returns half the bet (house edge ≈ 6%).
 * ===================================================================== */
(function (global) {
  'use strict';

  const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  const Duel = { el: null, bet: 30, rolling: false };

  Duel.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.rolling = false;
    this.render();
  };

  Duel.render = function () {
    this.el.innerHTML = `
      <div class="duel">
        <div class="duel-arena">
          <div class="duel-side">
            <div class="duel-label">Вы</div>
            <div class="duel-dice" id="duelYou"><span>⚄</span><span>⚂</span></div>
            <div class="duel-total" id="duelYouT">–</div>
          </div>
          <div class="duel-vs">VS</div>
          <div class="duel-side">
            <div class="duel-label">Дилер</div>
            <div class="duel-dice" id="duelDealer"><span>⚃</span><span>⚁</span></div>
            <div class="duel-total" id="duelDealerT">–</div>
          </div>
        </div>
        <div class="duel-msg" id="duelMsg">Больше очков — победа 2× · ничья вернёт половину</div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="duelBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="duelGo"><span>БРОСИТЬ ⚔️</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.rolling) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#duelBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#duelGo').addEventListener('click', () => self.roll());
  };

  Duel.roll = function () {
    if (this.rolling) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.rolling = true;
    PixelAudio.resume();
    PixelAudio.play('diceRoll');
    const msg = this.el.querySelector('#duelMsg');
    msg.textContent = 'Кости катятся...';
    msg.className = 'duel-msg';

    const d = () => 1 + Math.floor(Math.random() * 6);
    const you = [d(), d()];
    const dealer = [d(), d()];
    const yEl = this.el.querySelector('#duelYou').children;
    const dEl = this.el.querySelector('#duelDealer').children;

    // tumble animation
    let frames = 0;
    const spin = setInterval(() => {
      for (const el of [...yEl, ...dEl]) el.textContent = FACES[Math.floor(Math.random() * 6)];
      if (++frames % 3 === 0) PixelAudio.play('tick');
      if (frames >= 14) {
        clearInterval(spin);
        yEl[0].textContent = FACES[you[0] - 1];
        yEl[1].textContent = FACES[you[1] - 1];
        dEl[0].textContent = FACES[dealer[0] - 1];
        dEl[1].textContent = FACES[dealer[1] - 1];
        this.settle(you, dealer);
      }
    }, 90);
  };

  Duel.settle = function (you, dealer) {
    const yt = you[0] + you[1];
    const dt = dealer[0] + dealer[1];
    this.el.querySelector('#duelYouT').textContent = yt;
    this.el.querySelector('#duelDealerT').textContent = dt;
    const msg = this.el.querySelector('#duelMsg');
    if (yt > dt) {
      const payout = this.bet * 2;
      Casino.win(payout);
      msg.textContent = `⚔️ Победа ${yt}:${dt}! +${Casino.fmt(payout)}`;
      msg.className = 'duel-msg win';
      PixelAudio.play('win');
      Casino.confetti({ count: 70 });
    } else if (yt === dt) {
      const back = Math.floor(this.bet / 2);
      Casino.addBalance(back);
      msg.textContent = `Ничья ${yt}:${dt} · возврат ${Casino.fmt(back)}`;
      msg.className = 'duel-msg';
      PixelAudio.play('chip');
    } else {
      msg.textContent = `Дилер сильнее ${dt}:${yt} 😔`;
      msg.className = 'duel-msg lose';
      PixelAudio.play('lose');
    }
    this.rolling = false;
  };

  global.Duel = Duel;
})(window);
