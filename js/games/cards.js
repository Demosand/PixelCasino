/* =====================================================================
 *  Card games: Baccarat, Video Poker (Jacks or Better), Hi-Lo
 *  Reuses the .card visual styles from blackjack.
 * ===================================================================== */
(function (global) {
  'use strict';

  const SUITS = [
    { s: '♠', red: false },
    { s: '♥', red: true },
    { s: '♦', red: true },
    { s: '♣', red: false },
  ];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function freshDeck() {
    const d = [];
    for (const su of SUITS) for (let ri = 0; ri < RANKS.length; ri++) d.push({ r: RANKS[ri], ri, s: su.s, red: su.red });
    for (let i = d.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }
  function cardHtml(c, i) {
    if (!c) return `<div class="card back" style="--i:${i}">🂠</div>`;
    return `<div class="card ${c.red ? 'red' : ''}" style="--i:${i}"><span class="c-r">${c.r}</span><span class="c-s">${c.s}</span></div>`;
  }

  /* ============================ BACCARAT ============================ */
  const Baccarat = {
    el: null,
    bet: 50,
    pick: 'player',
    busy: false,
  };
  function bacVal(cards) {
    let t = 0;
    for (const c of cards) {
      let v = c.ri + 1;
      if (v >= 10) v = 0;
      t += v;
    }
    return t % 10;
  }
  Baccarat.open = function (c) {
    this.el = c;
    this.bet = 50;
    this.pick = 'player';
    this.render();
  };
  Baccarat.render = function () {
    this.el.innerHTML = `
      <div class="bac">
        <div class="bj-table bac-table">
          <div class="bj-row"><div class="bj-label">Банкир <span id="bacBVal" class="bj-score"></span></div><div class="bj-cards" id="bacBank"></div></div>
          <div class="bj-msg" id="bacMsg">Выберите ставку</div>
          <div class="bj-row"><div class="bj-label">Игрок <span id="bacPVal" class="bj-score"></span></div><div class="bj-cards" id="bacPlay"></div></div>
        </div>
        <div class="bac-picks">
          <button class="bac-pick on" data-pick="player">ИГРОК · 2.00×</button>
          <button class="bac-pick" data-pick="tie">НИЧЬЯ · 9.00×</button>
          <button class="bac-pick" data-pick="banker">БАНКИР · 1.95×</button>
        </div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-25">−</button><span class="st-val" id="bacBet">${this.bet}</span><button class="st-btn" data-d="25">+</button></div>
          </div>
          <button class="btn-spin" id="bacDeal"><span>РАЗДАТЬ 🃏</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => {
        PixelAudio.play('chip');
        self.pick = b.dataset.pick;
        self.el.querySelectorAll('[data-pick]').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      })
    );
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.busy) return;
        PixelAudio.play('click');
        self.bet = Math.max(25, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#bacBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#bacDeal').addEventListener('click', () => self.deal());
  };
  Baccarat.deal = function () {
    if (this.busy) return;
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    this.busy = true;
    PixelAudio.resume();
    const deck = freshDeck();
    const player = [deck.pop(), deck.pop()];
    const banker = [deck.pop(), deck.pop()];
    // simplified third-card rule
    const pv0 = bacVal(player);
    const bv0 = bacVal(banker);
    if (pv0 < 8 && bv0 < 8) {
      let pThird = null;
      if (pv0 <= 5) {
        pThird = deck.pop();
        player.push(pThird);
      }
      if (pThird === null) {
        if (bv0 <= 5) banker.push(deck.pop());
      } else {
        const pv = pThird.ri + 1 >= 10 ? 0 : pThird.ri + 1;
        const draw =
          bv0 <= 2 ||
          (bv0 === 3 && pv !== 8) ||
          (bv0 === 4 && pv >= 2 && pv <= 7) ||
          (bv0 === 5 && pv >= 4 && pv <= 7) ||
          (bv0 === 6 && pv >= 6 && pv <= 7);
        if (draw) banker.push(deck.pop());
      }
    }
    // animate reveal
    const pEl = this.el.querySelector('#bacPlay');
    const bEl = this.el.querySelector('#bacBank');
    pEl.innerHTML = '';
    bEl.innerHTML = '';
    const seq = [];
    player.forEach((c, i) => seq.push([pEl, c, i]));
    banker.forEach((c, i) => seq.push([bEl, c, i]));
    let k = 0;
    const reveal = () => {
      if (k >= seq.length) {
        this.settle(player, banker);
        return;
      }
      const [host, c, i] = seq[k++];
      host.insertAdjacentHTML('beforeend', cardHtml(c, host.children.length));
      PixelAudio.play('deal');
      setTimeout(reveal, 320);
    };
    this.el.querySelector('#bacMsg').textContent = 'Раздача…';
    reveal();
  };
  Baccarat.settle = function (player, banker) {
    const pv = bacVal(player);
    const bv = bacVal(banker);
    this.el.querySelector('#bacPVal').textContent = pv;
    this.el.querySelector('#bacBVal').textContent = bv;
    let result = pv > bv ? 'player' : bv > pv ? 'banker' : 'tie';
    const names = { player: 'Игрок', banker: 'Банкир', tie: 'Ничья' };
    let payout = 0;
    if (result === this.pick) {
      if (this.pick === 'player') payout = this.bet * 2;
      else if (this.pick === 'banker') payout = Math.floor(this.bet * 1.95);
      else payout = this.bet * 9;
    } else if (result === 'tie' && this.pick !== 'tie') {
      payout = this.bet; // bets push on a tie
    }
    const msg = this.el.querySelector('#bacMsg');
    msg.textContent = `${names[result]} побеждает (${pv}:${bv})`;
    if (payout > this.bet) {
      Casino.win(payout);
      PixelAudio.play(this.pick === 'tie' ? 'jackpot' : 'win');
      Casino.confetti({ count: this.pick === 'tie' ? 130 : 70 });
      Casino.toast(`Выигрыш +${Casino.fmt(payout)} 🎉`, 'good');
    } else if (payout === this.bet) {
      Casino.win(payout);
      PixelAudio.play('chip');
      Casino.toast('Ничья — ставка возвращена', 'gold');
    } else {
      PixelAudio.play('lose');
    }
    this.busy = false;
  };
  global.Baccarat = Baccarat;

  /* ========================== VIDEO POKER ========================== */
  const Poker = {
    el: null,
    bet: 25,
    deck: [],
    hand: [],
    held: [false, false, false, false, false],
    phase: 'bet',
  };
  const PAYS = [
    { name: 'Роял-флеш', mult: 250 },
    { name: 'Стрит-флеш', mult: 50 },
    { name: 'Каре', mult: 25 },
    { name: 'Фулл-хаус', mult: 9 },
    { name: 'Флеш', mult: 6 },
    { name: 'Стрит', mult: 4 },
    { name: 'Тройка', mult: 3 },
    { name: 'Две пары', mult: 2 },
    { name: 'Пара (валеты+)', mult: 1 },
  ];
  Poker.open = function (c) {
    this.el = c;
    this.bet = 25;
    this.phase = 'bet';
    this.render();
  };
  Poker.render = function () {
    this.el.innerHTML = `
      <div class="poker">
        <div class="poker-pays">${PAYS.map((p) => `<div class="pp-row"><span>${p.name}</span><b>${p.mult}×</b></div>`).join('')}</div>
        <div class="poker-hand" id="pkrHand"></div>
        <div class="poker-msg" id="pkrMsg">Нажмите «Раздать»</div>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-25">−</button><span class="st-val" id="pkrBet">${this.bet}</span><button class="st-btn" data-d="25">+</button></div>
          </div>
          <button class="btn-spin" id="pkrBtn"><span>РАЗДАТЬ 🃏</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.phase === 'draw') return;
        PixelAudio.play('click');
        self.bet = Math.max(25, Math.min(500, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#pkrBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#pkrBtn').addEventListener('click', () => self.action());
    this.renderHand();
  };
  Poker.renderHand = function () {
    const host = this.el.querySelector('#pkrHand');
    host.innerHTML = this.hand.length
      ? this.hand
          .map(
            (c, i) =>
              `<div class="pkr-slot ${this.held[i] ? 'held' : ''}" data-i="${i}">
                ${cardHtml(c, i)}
                <div class="pkr-hold">${this.held[i] ? 'ДЕРЖУ' : 'держать'}</div>
              </div>`
          )
          .join('')
      : [0, 1, 2, 3, 4].map((i) => `<div class="pkr-slot"><div class="card back">🂠</div></div>`).join('');
    if (this.phase === 'draw') {
      host.querySelectorAll('.pkr-slot').forEach((s) =>
        s.addEventListener('click', () => {
          const i = parseInt(s.dataset.i);
          this.held[i] = !this.held[i];
          PixelAudio.play('pokerHold');
          this.renderHand();
        })
      );
    }
  };
  Poker.action = function () {
    if (this.phase === 'bet') this.deal();
    else if (this.phase === 'draw') this.draw();
  };
  Poker.deal = function () {
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    PixelAudio.play('shuffle');
    this.deck = freshDeck();
    this.hand = [];
    this.held = [false, false, false, false, false];
    this.phase = 'deal';
    let i = 0;
    const step = () => {
      if (i >= 5) {
        this.phase = 'draw';
        this.renderHand();
        this.el.querySelector('#pkrMsg').textContent = 'Выберите карты для замены';
        this.el.querySelector('#pkrBtn').querySelector('span').textContent = 'ЗАМЕНА ▶';
        return;
      }
      this.hand.push(this.deck.pop());
      PixelAudio.play('deal');
      this.renderHand();
      i++;
      setTimeout(step, 200);
    };
    step();
  };
  Poker.draw = function () {
    PixelAudio.play('shuffle');
    for (let i = 0; i < 5; i++) if (!this.held[i]) this.hand[i] = this.deck.pop();
    this.phase = 'bet';
    this.renderHand();
    this.evaluate();
    this.el.querySelector('#pkrBtn').querySelector('span').textContent = 'РАЗДАТЬ 🃏';
  };
  Poker.evaluate = function () {
    const h = this.hand;
    const ranks = h.map((c) => c.ri).sort((a, b) => a - b);
    const suits = h.map((c) => c.s);
    const counts = {};
    ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
    const vals = Object.values(counts).sort((a, b) => b - a);
    const flush = suits.every((s) => s === suits[0]);
    let straight = true;
    for (let i = 1; i < 5; i++) if (ranks[i] !== ranks[i - 1] + 1) straight = false;
    // wheel A-2-3-4-5
    const isWheel = JSON.stringify(ranks) === JSON.stringify([0, 1, 2, 3, 12]);
    if (isWheel) straight = true;
    const royal = flush && JSON.stringify(ranks) === JSON.stringify([8, 9, 10, 11, 12]);

    let result = null;
    if (royal) result = PAYS[0];
    else if (straight && flush) result = PAYS[1];
    else if (vals[0] === 4) result = PAYS[2];
    else if (vals[0] === 3 && vals[1] === 2) result = PAYS[3];
    else if (flush) result = PAYS[4];
    else if (straight) result = PAYS[5];
    else if (vals[0] === 3) result = PAYS[6];
    else if (vals[0] === 2 && vals[1] === 2) result = PAYS[7];
    else if (vals[0] === 2) {
      // pair must be jacks or better
      const pairRank = +Object.keys(counts).find((k) => counts[k] === 2);
      if (pairRank >= 9 || pairRank === 12) result = PAYS[8]; // J,Q,K or A
    }

    const msg = this.el.querySelector('#pkrMsg');
    if (result) {
      const win = this.bet * result.mult;
      Casino.win(win);
      msg.textContent = `${result.name}! +${Casino.fmt(win)} 🎉`;
      msg.style.color = 'var(--green)';
      PixelAudio.play(result.mult >= 25 ? 'jackpot' : result.mult >= 6 ? 'bigWin' : 'win');
      Casino.confetti({ count: result.mult >= 25 ? 160 : 70 });
    } else {
      msg.textContent = 'Нет комбинации 😔';
      msg.style.color = '';
      PixelAudio.play('lose');
    }
  };
  global.Poker = Poker;

  /* ============================== HI-LO ============================== */
  const HiLo = {
    el: null,
    bet: 30,
    deck: [],
    current: null,
    mult: 1,
    busy: false,
    active: false,
  };
  HiLo.open = function (c) {
    this.el = c;
    this.bet = 30;
    this.active = false;
    this.render();
  };
  HiLo.render = function () {
    this.el.innerHTML = `
      <div class="hilo">
        <div class="hilo-mult" id="hlMult">1.00×</div>
        <div class="hilo-card" id="hlCard"><div class="card back" style="font-size:48px">🂠</div></div>
        <div class="hilo-odds" id="hlOdds"></div>
        <div class="hilo-actions" id="hlActions">
          <button class="btn-action hit" id="hlHigher">ВЫШЕ ▲</button>
          <button class="btn-action stand" id="hlLower">НИЖЕ ▼</button>
        </div>
        <button class="hilo-cash" id="hlCash" style="display:none">ЗАБРАТЬ <b id="hlCashVal"></b></button>
        <div class="dice-controls">
          <div class="ctl-group"><span class="ctl-label">Ставка</span>
            <div class="stepper"><button class="st-btn" data-d="-10">−</button><span class="st-val" id="hlBet">${this.bet}</span><button class="st-btn" data-d="10">+</button></div>
          </div>
          <button class="btn-spin" id="hlStart"><span>ИГРАТЬ 🎴</span></button>
        </div>
      </div>`;
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.active) return;
        PixelAudio.play('click');
        self.bet = Math.max(10, Math.min(500, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#hlBet').textContent = self.bet;
      })
    );
    this.el.querySelector('#hlStart').addEventListener('click', () => self.start());
    this.el.querySelector('#hlHigher').addEventListener('click', () => self.guess('higher'));
    this.el.querySelector('#hlLower').addEventListener('click', () => self.guess('lower'));
    this.el.querySelector('#hlCash').addEventListener('click', () => self.cashOut());
    this.setActions(false);
  };
  HiLo.setActions = function (on) {
    this.el.querySelector('#hlActions').style.opacity = on ? '1' : '0.35';
    this.el.querySelector('#hlActions').style.pointerEvents = on ? 'auto' : 'none';
    this.el.querySelector('#hlCash').style.display = on && this.mult > 1 ? 'block' : 'none';
  };
  HiLo.start = function () {
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    PixelAudio.play('shuffle');
    this.deck = freshDeck();
    this.current = this.deck.pop();
    this.mult = 1;
    this.active = true;
    this.showCard();
    this.updateOdds();
    this.setActions(true);
    this.el.querySelector('#hlMult').textContent = '1.00×';
    this.el.querySelector('#hlStart').querySelector('span').textContent = 'НОВАЯ ИГРА';
  };
  HiLo.showCard = function (flip) {
    const host = this.el.querySelector('#hlCard');
    host.innerHTML = `<div class="card big ${this.current.red ? 'red' : ''}" style="font-size:30px"><span class="c-r">${this.current.r}</span><span class="c-s">${this.current.s}</span></div>`;
    if (flip) {
      const c = host.firstChild;
      c.style.animation = 'dealIn .35s';
    }
    PixelAudio.play('cardFlip');
  };
  HiLo.updateOdds = function () {
    // probability among remaining 13 ranks (ignore suit for simplicity using rank index)
    const ri = this.current.ri;
    const higher = 12 - ri; // ranks strictly higher
    const lower = ri; // ranks strictly lower
    const totalR = 13;
    const pH = (higher + 0.5) / totalR; // tie split
    const pL = (lower + 0.5) / totalR;
    const mH = pH > 0 ? (0.97 / pH).toFixed(2) : '—';
    const mL = pL > 0 ? (0.97 / pL).toFixed(2) : '—';
    this.el.querySelector('#hlOdds').innerHTML = `<span>▲ ${mH}×</span><span>▼ ${mL}×</span>`;
    this._mH = parseFloat(mH);
    this._mL = parseFloat(mL);
  };
  HiLo.guess = function (dir) {
    if (!this.active) return;
    const next = this.deck.pop();
    const prev = this.current;
    const correct = dir === 'higher' ? next.ri >= prev.ri : next.ri <= prev.ri;
    this.current = next;
    this.showCard(true);
    if (correct) {
      this.mult *= dir === 'higher' ? this._mH : this._mL;
      this.mult = Math.round(this.mult * 100) / 100;
      this.el.querySelector('#hlMult').textContent = this.mult.toFixed(2) + '×';
      this.el.querySelector('#hlCashVal').textContent = Casino.fmt(Math.round(this.bet * this.mult));
      PixelAudio.play('coin');
      Casino.toast(`Верно! ${this.mult.toFixed(2)}×`, 'good');
      this.updateOdds();
      this.setActions(true);
      if (this.deck.length < 2) this.cashOut();
    } else {
      PixelAudio.play('lose');
      Casino.shake(this.el.querySelector('#hlCard'), 1.2);
      this.el.querySelector('#hlMult').textContent = 'БУСТ 💥';
      Casino.toast('Не угадали — ставка потеряна', 'bad');
      this.active = false;
      this.setActions(false);
    }
  };
  HiLo.cashOut = function () {
    if (!this.active || this.mult <= 1) return;
    const win = Math.round(this.bet * this.mult);
    Casino.win(win);
    PixelAudio.play(this.mult >= 5 ? 'bigWin' : 'win');
    Casino.confetti({ count: this.mult >= 5 ? 100 : 60 });
    Casino.toast(`Забрано ${this.mult.toFixed(2)}× → +${Casino.fmt(win)} 🎉`, 'good');
    this.active = false;
    this.setActions(false);
  };
  global.HiLo = HiLo;
})(window);
