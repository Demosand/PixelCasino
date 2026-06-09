/* =====================================================================
 *  Mines — reveal gems, avoid bombs, cash out a growing multiplier
 * ===================================================================== */
(function (global) {
  'use strict';

  const Mines = {
    el: null,
    bet: 50,
    size: 25,
    mines: 5,
    grid: [],
    revealed: 0,
    active: false,
    mult: 1,
  };

  Mines.open = function (c) {
    this.el = c;
    this.bet = 50;
    this.mines = 5;
    this.active = false;
    this.render();
  };

  // fair multiplier: product of (cells-left)/(safe-left) with 2% edge
  Mines.multAfter = function (picks) {
    const total = this.size;
    let m = 1;
    for (let i = 0; i < picks; i++) {
      const cellsLeft = total - i;
      const safeLeft = total - this.mines - i;
      m *= cellsLeft / safeLeft;
    }
    return m * 0.98;
  };

  Mines.render = function () {
    this.el.innerHTML = `
      <div class="mines-game">
        <div class="mines-top">
          <div class="mines-stat"><span>Множитель</span><b id="mMult">1.00×</b></div>
          <div class="mines-stat"><span>Выплата</span><b id="mPay">0</b></div>
          <div class="mines-stat"><span>Следующая</span><b id="mNext">—</b></div>
        </div>
        <div class="mines-grid" id="minesGrid"></div>
        <div class="mines-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка</span>
            <div class="stepper">
              <button class="st-btn" data-d="-25">−</button>
              <span class="st-val" id="minesBet">${this.bet}</span>
              <button class="st-btn" data-d="25">+</button>
            </div>
          </div>
          <div class="ctl-group">
            <span class="ctl-label">Мины</span>
            <div class="stepper">
              <button class="st-btn" data-m="-1">−</button>
              <span class="st-val" id="minesCount">${this.mines}</span>
              <button class="st-btn" data-m="1">+</button>
            </div>
          </div>
          <button class="btn-spin" id="minesStart"><span>ИГРАТЬ 💎</span></button>
        </div>
      </div>`;

    const gridEl = this.el.querySelector('#minesGrid');
    for (let i = 0; i < this.size; i++) {
      const cell = document.createElement('button');
      cell.className = 'mine-cell';
      cell.dataset.i = i;
      cell.addEventListener('click', () => this.reveal(i));
      gridEl.appendChild(cell);
    }

    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.active) return;
        PixelAudio.play('click');
        if (b.dataset.d) {
          self.bet = Math.max(25, Math.min(1000, self.bet + parseInt(b.dataset.d)));
          self.el.querySelector('#minesBet').textContent = self.bet;
        } else {
          self.mines = Math.max(1, Math.min(24, self.mines + parseInt(b.dataset.m)));
          self.el.querySelector('#minesCount').textContent = self.mines;
        }
      })
    );
    this.el.querySelector('#minesStart').addEventListener('click', () => self.toggle());
    this.updateStats();
  };

  Mines.toggle = function () {
    if (this.active) this.cashOut();
    else this.start();
  };

  Mines.start = function () {
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    this.active = true;
    this.revealed = 0;
    this.mult = 1;
    // place mines
    const idxs = [...Array(this.size).keys()];
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    const mineSet = new Set(idxs.slice(0, this.mines));
    this.grid = [];
    for (let i = 0; i < this.size; i++) this.grid.push(mineSet.has(i) ? 'mine' : 'gem');

    this.el.querySelectorAll('.mine-cell').forEach((c) => {
      c.className = 'mine-cell';
      c.textContent = '';
      c.disabled = false;
    });
    const btn = this.el.querySelector('#minesStart');
    btn.classList.add('cashout');
    btn.querySelector('span').textContent = 'ЗАБРАТЬ';
    this.updateStats();
  };

  Mines.reveal = function (i) {
    if (!this.active) return;
    const cell = this.el.querySelector(`.mine-cell[data-i="${i}"]`);
    if (cell.classList.contains('open')) return;

    if (this.grid[i] === 'mine') {
      cell.classList.add('open', 'bomb');
      cell.textContent = '💣';
      PixelAudio.play('error');
      this.bust(i);
      return;
    }
    cell.classList.add('open', 'gem');
    cell.textContent = '💎';
    PixelAudio.play('coin');
    this.revealed++;
    this.mult = this.multAfter(this.revealed);
    this.updateStats();

    if (this.revealed === this.size - this.mines) {
      this.cashOut(true);
    }
  };

  Mines.bust = function (hitIdx) {
    this.active = false;
    this.el.querySelectorAll('.mine-cell').forEach((c, i) => {
      c.disabled = true;
      if (this.grid[i] === 'mine' && i !== hitIdx) {
        c.classList.add('open', 'bomb-faded');
        c.textContent = '💣';
      }
    });
    Casino.shake(this.el.querySelector('.mines-grid'), 1.5);
    Casino.toast('💥 Бомба! Ставка потеряна', 'bad');
    const btn = this.el.querySelector('#minesStart');
    btn.classList.remove('cashout');
    btn.querySelector('span').textContent = 'ИГРАТЬ 💎';
  };

  Mines.cashOut = function (cleared) {
    if (!this.active || this.revealed === 0) {
      if (this.revealed === 0) {
        // cancel — refund
        Casino.win(this.bet);
        this.active = false;
        const btn = this.el.querySelector('#minesStart');
        btn.classList.remove('cashout');
        btn.querySelector('span').textContent = 'ИГРАТЬ 💎';
        return;
      }
    }
    const win = Math.round(this.bet * this.mult);
    Casino.win(win);
    PixelAudio.play(this.mult >= 5 ? 'bigWin' : 'win');
    Casino.toast(`${cleared ? 'Поле очищено! ' : ''}Забрано ${this.mult.toFixed(2)}× → +${Casino.fmt(win)} 🎉`, 'good');
    Casino.confetti({ count: this.mult >= 5 ? 100 : 60 });
    this.active = false;
    // reveal remaining mines
    this.el.querySelectorAll('.mine-cell').forEach((c, i) => {
      c.disabled = true;
      if (this.grid[i] === 'mine') {
        c.classList.add('open', 'bomb-faded');
        c.textContent = '💣';
      }
    });
    const btn = this.el.querySelector('#minesStart');
    btn.classList.remove('cashout');
    btn.querySelector('span').textContent = 'ИГРАТЬ 💎';
  };

  Mines.updateStats = function () {
    this.el.querySelector('#mMult').textContent = this.mult.toFixed(2) + '×';
    this.el.querySelector('#mPay').textContent = Casino.fmt(Math.round(this.bet * this.mult));
    const next = this.active ? this.multAfter(this.revealed + 1) : this.multAfter(1);
    this.el.querySelector('#mNext').textContent = next.toFixed(2) + '×';
  };

  global.Mines = Mines;
})(window);
