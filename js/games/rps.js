/* =====================================================================
 *  Rock · Paper · Scissors — beat the dealer, win 2×, tie returns bet
 * ===================================================================== */
(function (global) {
  'use strict';

  const MOVES = [
    { id: 'rock', emoji: '✊', name: 'Камень', beats: 'scissors' },
    { id: 'paper', emoji: '✋', name: 'Бумага', beats: 'rock' },
    { id: 'scissors', emoji: '✌️', name: 'Ножницы', beats: 'paper' },
  ];

  const RPS = {
    el: null,
    bet: 30,
    busy: false,
    wins: 0,
    streak: 0,
  };
  RPS.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.streak = 0;
    this.render();
  };
  RPS.render = function () {
    this.el.innerHTML = `
      <div class="rps">
        <div class="rps-arena">
          <div class="rps-side">
            <div class="rps-label">Вы</div>
            <div class="rps-hand" id="rpsYou">✊</div>
          </div>
          <div class="rps-vs" id="rpsVs">VS</div>
          <div class="rps-side">
            <div class="rps-label">Дилер</div>
            <div class="rps-hand dealer" id="rpsDealer">✊</div>
          </div>
        </div>
        <div class="rps-msg" id="rpsMsg">Выберите ход</div>
        <div class="rps-streak" id="rpsStreak">Серия побед: 0</div>
        <div class="rps-picks" id="rpsPicks">
          ${MOVES.map((m) => `<button class="rps-pick" data-move="${m.id}">${m.emoji}<small>${m.name}</small></button>`).join('')}
        </div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="rpsBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
        </div>
        <div class="cups-hint">Победа 2× · ничья возвращает ставку</div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('[data-move]').forEach((b) =>
      b.addEventListener('click', () => self.play(b.dataset.move))
    );
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.busy) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#rpsBet').textContent = self.bet;
      })
    );
  };
  RPS.play = function (moveId) {
    if (this.busy) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.busy = true;
    PixelAudio.resume();
    const you = MOVES.find((m) => m.id === moveId);
    const dealer = MOVES[(Math.random() * 3) | 0];
    const youEl = this.el.querySelector('#rpsYou');
    const dealerEl = this.el.querySelector('#rpsDealer');
    const msg = this.el.querySelector('#rpsMsg');
    msg.className = 'rps-msg';
    msg.textContent = '…';

    // shake countdown
    youEl.classList.add('shaking');
    dealerEl.classList.add('shaking');
    youEl.textContent = '✊';
    dealerEl.textContent = '✊';
    let beats = 0;
    const cd = setInterval(() => {
      PixelAudio.play('rpsBeat');
      beats++;
      if (beats >= 3) {
        clearInterval(cd);
        youEl.classList.remove('shaking');
        dealerEl.classList.remove('shaking');
        youEl.textContent = you.emoji;
        dealerEl.textContent = dealer.emoji;
        PixelAudio.play('rpsShow');
        this.settle(you, dealer);
      }
    }, 320);
  };
  RPS.settle = function (you, dealer) {
    const msg = this.el.querySelector('#rpsMsg');
    let outcome, payout = 0;
    if (you.id === dealer.id) {
      outcome = 'Ничья 🤝';
      payout = this.bet;
    } else if (you.beats === dealer.id) {
      outcome = 'Вы победили! 🎉';
      payout = this.bet * 2;
      this.streak++;
    } else {
      outcome = 'Дилер победил 😔';
      this.streak = 0;
    }
    msg.textContent = outcome;
    this.el.querySelector('#rpsStreak').textContent = 'Серия побед: ' + this.streak;
    if (payout > this.bet) {
      Casino.win(payout);
      msg.className = 'rps-msg win';
      PixelAudio.play('win');
      Casino.confetti({ count: 60 });
    } else if (payout === this.bet) {
      Casino.win(payout);
      msg.className = 'rps-msg';
      PixelAudio.play('chip');
    } else {
      msg.className = 'rps-msg lose';
      PixelAudio.play('lose');
      Casino.shake(this.el.querySelector('.rps-arena'), 1);
    }
    this.busy = false;
  };
  global.RPS = RPS;
})(window);
