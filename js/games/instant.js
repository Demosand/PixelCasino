/* =====================================================================
 *  Instant games: Dice (over/under), Coin Flip, Hi-Lo card
 * ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------- DICE ---------------------------- */
  const Dice = {
    el: null,
    bet: 20,
    target: 50,
    mode: 'over',
    rolling: false,
  };

  Dice.open = function (c) {
    this.el = c;
    this.bet = 20;
    this.target = 50;
    this.mode = 'over';
    this.render();
  };

  Dice.payout = function () {
    const chance = this.mode === 'over' ? 100 - this.target : this.target;
    if (chance <= 0) return 0;
    return (99 / chance); // 1% house edge
  };

  Dice.render = function () {
    this.el.innerHTML = `
      <div class="dice-game">
        <div class="dice-result" id="diceResult">—</div>
        <div class="dice-bar">
          <div class="dice-fill" id="diceFill"></div>
          <div class="dice-marker" id="diceMarker" style="left:50%"></div>
          <div class="dice-pointer" id="dicePointer" style="left:50%"></div>
        </div>
        <div class="dice-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
        <div class="dice-mode">
          <button data-mode="under" id="dUnder">МЕНЬШЕ ▼</button>
          <button data-mode="over" class="on" id="dOver">БОЛЬШЕ ▲</button>
        </div>
        <input type="range" min="2" max="98" value="50" id="diceSlider" class="dice-slider">
        <div class="dice-stats">
          <div><span>Шанс</span><b id="dChance">50%</b></div>
          <div><span>Выплата</span><b id="dMult">1.98×</b></div>
          <div><span>Порог</span><b id="dTarget">50</b></div>
        </div>
        <div class="dice-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка</span>
            <div class="stepper">
              <button class="st-btn" data-d="-10">−</button>
              <span class="st-val" id="diceBet">${this.bet}</span>
              <button class="st-btn" data-d="10">+</button>
            </div>
          </div>
          <button class="btn-spin" id="diceRoll"><span>БРОСИТЬ 🎲</span></button>
        </div>
      </div>`;
    this.bind();
    this.refresh();
  };

  Dice.bind = function () {
    const self = this;
    const slider = this.el.querySelector('#diceSlider');
    slider.addEventListener('input', () => {
      self.target = parseInt(slider.value);
      PixelAudio.play('tick');
      self.refresh();
    });
    this.el.querySelectorAll('[data-mode]').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.mode = b.dataset.mode;
        self.el.querySelectorAll('[data-mode]').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        self.refresh();
      })
    );
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#diceBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#diceRoll').addEventListener('click', () => self.roll());
  };

  Dice.refresh = function () {
    const chance = this.mode === 'over' ? 100 - this.target : this.target;
    this.el.querySelector('#dChance').textContent = chance + '%';
    this.el.querySelector('#dMult').textContent = this.payout().toFixed(2) + '×';
    this.el.querySelector('#dTarget').textContent = this.target;
    const fill = this.el.querySelector('#diceFill');
    const marker = this.el.querySelector('#diceMarker');
    const pointer = this.el.querySelector('#dicePointer');
    marker.style.left = this.target + '%';
    if (this.mode === 'over') {
      fill.style.left = this.target + '%';
      fill.style.right = '0';
      fill.style.width = 'auto';
    } else {
      fill.style.left = '0';
      fill.style.right = 'auto';
      fill.style.width = this.target + '%';
    }
  };

  Dice.roll = function () {
    if (this.rolling) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.rolling = true;
    PixelAudio.resume();
    PixelAudio.play('diceRoll');
    const result = Math.round(Math.random() * 10000) / 100;
    const pointer = this.el.querySelector('#dicePointer');
    const resEl = this.el.querySelector('#diceResult');

    let frame = 0;
    const anim = setInterval(() => {
      const r = Math.random() * 100;
      pointer.style.left = r + '%';
      resEl.textContent = r.toFixed(2);
      frame++;
      if (frame > 14) {
        clearInterval(anim);
        pointer.style.left = result + '%';
        resEl.textContent = result.toFixed(2);
        this.settle(result);
      }
    }, 55);
  };

  Dice.settle = function (result) {
    const win = this.mode === 'over' ? result > this.target : result < this.target;
    const resEl = this.el.querySelector('#diceResult');
    if (win) {
      const payout = Math.round(this.bet * this.payout());
      Casino.win(payout);
      resEl.className = 'dice-result win';
      PixelAudio.play(this.payout() > 4 ? 'bigWin' : 'win');
      Casino.toast(`${result.toFixed(2)} — Выигрыш +${Casino.fmt(payout)} 🎉`, 'good');
      if (this.payout() > 4) Casino.confetti({ count: 80 });
    } else {
      resEl.className = 'dice-result lose';
      PixelAudio.play('lose');
    }
    setTimeout(() => (resEl.className = 'dice-result'), 1200);
    this.rolling = false;
  };

  global.Dice = Dice;

  /* -------------------------- COIN FLIP -------------------------- */
  const Coin = {
    el: null,
    bet: 20,
    choice: 'heads',
    flipping: false,
    streak: 0,
  };

  Coin.open = function (c) {
    this.el = c;
    this.bet = 20;
    this.streak = 0;
    this.render();
  };

  Coin.render = function () {
    this.el.innerHTML = `
      <div class="coin-game">
        <div class="coin3d" id="coin3d">
          <div class="coin-face heads">👑</div>
          <div class="coin-face tails">⚡</div>
        </div>
        <div class="coin-streak" id="coinStreak">Серия: 0</div>
        <div class="coin-choice">
          <button data-side="heads" class="on" id="cHeads">👑 ОРЁЛ</button>
          <button data-side="tails" id="cTails">⚡ РЕШКА</button>
        </div>
        <div class="dice-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка</span>
            <div class="stepper">
              <button class="st-btn" data-d="-10">−</button>
              <span class="st-val" id="coinBet">${this.bet}</span>
              <button class="st-btn" data-d="10">+</button>
            </div>
          </div>
          <button class="btn-spin" id="coinFlip"><span>ПОДБРОСИТЬ</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('[data-side]').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.choice = b.dataset.side;
        self.el.querySelectorAll('[data-side]').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      })
    );
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#coinBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#coinFlip').addEventListener('click', () => self.flip());
  };

  Coin.flip = function () {
    if (this.flipping) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.flipping = true;
    PixelAudio.resume();
    PixelAudio.play('spin');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const coin = this.el.querySelector('#coin3d');
    const spins = 5;
    const final = result === 'heads' ? 0 : 180;
    coin.style.transition = 'transform 1.6s cubic-bezier(.2,.7,.2,1)';
    coin.style.transform = `rotateY(${spins * 360 + final}deg)`;
    const tk = setInterval(() => PixelAudio.play('tick'), 120);
    setTimeout(() => {
      clearInterval(tk);
      coin.style.transition = 'none';
      coin.style.transform = `rotateY(${final}deg)`;
      this.settle(result);
    }, 1700);
  };

  Coin.settle = function (result) {
    if (result === this.choice) {
      this.streak++;
      const payout = Math.round(this.bet * 1.98);
      Casino.win(payout);
      PixelAudio.play('win');
      Casino.toast(`${result === 'heads' ? '👑 Орёл' : '⚡ Решка'}! +${Casino.fmt(payout)}`, 'good');
      Casino.confetti({ count: 50 });
    } else {
      this.streak = 0;
      PixelAudio.play('lose');
      Casino.toast(`${result === 'heads' ? '👑 Орёл' : '⚡ Решка'}. Мимо`, 'bad');
    }
    this.el.querySelector('#coinStreak').textContent = 'Серия: ' + this.streak;
    this.flipping = false;
  };

  global.Coin = Coin;
})(window);
