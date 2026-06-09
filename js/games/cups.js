/* =====================================================================
 *  Cups (Thimblerig) — follow the ball, then pick the right cup
 * ===================================================================== */
(function (global) {
  'use strict';

  const Cups = {
    el: null,
    bet: 30,
    slots: [0, 1, 2], // slot position -> cup id
    ballCup: 0,
    busy: false,
    phase: 'idle',
  };
  Cups.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.busy = false;
    this.phase = 'idle';
    this.render();
  };
  Cups.render = function () {
    this.el.innerHTML = `
      <div class="cups">
        <div class="cups-stage" id="cupsStage">
          ${[0, 1, 2]
            .map(
              (i) => `<div class="cup-wrap" data-cup="${i}" style="--slot:${i}">
                <div class="cup" id="cup${i}">🥤</div>
                <div class="cup-ball" id="ball${i}">🔴</div>
              </div>`
            )
            .join('')}
        </div>
        <div class="cups-msg" id="cupsMsg">Купи раунд и следи за шариком</div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="cupsBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="cupsGo"><span>ИГРАТЬ 🥤</span></button>
        </div>
        <div class="cups-hint">Угадай — выплата 2.9×</div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.busy) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#cupsBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#cupsGo').addEventListener('click', () => self.start());
    this.el.querySelectorAll('.cup-wrap').forEach((w) =>
      w.addEventListener('click', () => self.pick(parseInt(w.dataset.cup)))
    );
    this.layout();
  };
  Cups.layout = function () {
    // place each cup-wrap at its slot
    this.slots.forEach((cupId, slot) => {
      const w = this.el.querySelector(`.cup-wrap[data-cup="${cupId}"]`);
      if (w) w.style.setProperty('--slot', slot);
    });
  };
  Cups.start = function () {
    if (this.busy) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.busy = true;
    PixelAudio.resume();
    this.slots = [0, 1, 2];
    this.layout();
    this.ballCup = (Math.random() * 3) | 0;
    // reset visuals
    this.el.querySelectorAll('.cup').forEach((c) => c.classList.remove('lifted', 'reveal'));
    this.el.querySelectorAll('.cup-ball').forEach((b) => (b.style.opacity = '0'));
    const msg = this.el.querySelector('#cupsMsg');
    msg.className = 'cups-msg';
    msg.textContent = 'Запомни, где шарик!';

    // show the ball under its cup
    const ballEl = this.el.querySelector('#ball' + this.ballCup);
    const cupEl = this.el.querySelector('#cup' + this.ballCup);
    ballEl.style.opacity = '1';
    cupEl.classList.add('lifted');
    PixelAudio.play('reveal');

    setTimeout(() => {
      cupEl.classList.remove('lifted');
      ballEl.style.opacity = '0';
      PixelAudio.play('cupDown');
      setTimeout(() => this.shuffle(), 500);
    }, 1100);
  };
  Cups.shuffle = function () {
    const msg = this.el.querySelector('#cupsMsg');
    msg.textContent = 'Следи внимательно… 👀';
    const swaps = 7;
    let n = 0;
    const doSwap = () => {
      if (n >= swaps) {
        msg.textContent = 'Где шарик? Выбери чашку! 👆';
        this.phase = 'pick';
        return;
      }
      let a = (Math.random() * 3) | 0;
      let b = (Math.random() * 3) | 0;
      while (b === a) b = (Math.random() * 3) | 0;
      // swap slot assignments
      const tmp = this.slots[a];
      this.slots[a] = this.slots[b];
      this.slots[b] = tmp;
      this.layout();
      PixelAudio.play('swoosh');
      n++;
      setTimeout(doSwap, 360 - Math.min(180, n * 18));
    };
    doSwap();
  };
  Cups.pick = function (cupId) {
    if (this.phase !== 'pick') return;
    this.phase = 'idle';
    const cupEl = this.el.querySelector('#cup' + cupId);
    const ballEl = this.el.querySelector('#ball' + cupId);
    cupEl.classList.add('lifted', 'reveal');
    if (cupId === this.ballCup) ballEl.style.opacity = '1';
    PixelAudio.play('reveal');

    const msg = this.el.querySelector('#cupsMsg');
    setTimeout(() => {
      if (cupId === this.ballCup) {
        const win = Math.round(this.bet * 2.9);
        Casino.win(win);
        msg.textContent = `🎉 Верно! +${Casino.fmt(win)}`;
        msg.className = 'cups-msg win';
        PixelAudio.play('bigWin');
        Casino.confetti({ count: 90 });
      } else {
        // reveal where it actually was
        const realCup = this.ballCup;
        this.el.querySelector('#cup' + realCup).classList.add('lifted');
        this.el.querySelector('#ball' + realCup).style.opacity = '1';
        msg.textContent = '😔 Мимо! Шарик был под другой чашкой';
        msg.className = 'cups-msg lose';
        PixelAudio.play('lose');
      }
      this.busy = false;
    }, 350);
  };
  global.Cups = Cups;
})(window);
