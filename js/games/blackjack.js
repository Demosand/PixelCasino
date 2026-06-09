/* =====================================================================
 *  Blackjack — single deck shoe, hit/stand/double, dealer stands on 17
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

  const BJ = {
    el: null,
    bet: 50,
    shoe: [],
    player: [],
    dealer: [],
    phase: 'bet', // bet | play | done
    doubled: false,
  };

  function newShoe() {
    const deck = [];
    for (let d = 0; d < 4; d++)
      for (const su of SUITS) for (const r of RANKS) deck.push({ r, s: su.s, red: su.red });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function val(hand) {
    let total = 0,
      aces = 0;
    for (const c of hand) {
      if (c.r === 'A') {
        aces++;
        total += 11;
      } else if (['K', 'Q', 'J'].includes(c.r)) total += 10;
      else total += parseInt(c.r);
    }
    while (total > 21 && aces) {
      total -= 10;
      aces--;
    }
    return total;
  }

  BJ.open = function (container) {
    this.el = container;
    this.bet = 50;
    this.phase = 'bet';
    if (this.shoe.length < 20) this.shoe = newShoe();
    this.player = [];
    this.dealer = [];
    this.render();
  };

  BJ.render = function () {
    this.el.innerHTML = `
      <div class="bj">
        <div class="bj-table">
          <div class="bj-row">
            <div class="bj-label">Дилер <span id="dVal" class="bj-score"></span></div>
            <div class="bj-cards" id="dealerCards"></div>
          </div>
          <div class="bj-msg" id="bjMsg">Сделайте ставку и раздайте карты</div>
          <div class="bj-row">
            <div class="bj-label">Вы <span id="pVal" class="bj-score"></span></div>
            <div class="bj-cards" id="playerCards"></div>
          </div>
        </div>
        <div class="bj-controls">
          <div class="ctl-group">
            <span class="ctl-label">Ставка</span>
            <div class="stepper">
              <button class="st-btn" data-d="-25">−</button>
              <span class="st-val" id="bjBet">${this.bet}</span>
              <button class="st-btn" data-d="25">+</button>
            </div>
          </div>
          <div class="bj-actions" id="bjActions">
            <button class="btn-spin" id="bjDeal"><span>РАЗДАТЬ</span></button>
          </div>
        </div>
      </div>`;
    this.bindBet();
    this.bindActions();
    this.updateScores();
  };

  BJ.bindBet = function () {
    const self = this;
    this.el.querySelectorAll('.st-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (self.phase !== 'bet') return;
        PixelAudio.play('click');
        self.bet = Math.max(25, Math.min(1000, self.bet + parseInt(b.dataset.d)));
        self.el.querySelector('#bjBet').textContent = self.bet;
      })
    );
  };

  BJ.bindActions = function () {
    const deal = this.el.querySelector('#bjDeal');
    if (deal) deal.addEventListener('click', () => this.deal());
  };

  BJ.deal = function () {
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      Casino.toast('Недостаточно кредитов 💸', 'bad');
      return;
    }
    PixelAudio.resume();
    if (this.shoe.length < 20) this.shoe = newShoe();
    this.player = [];
    this.dealer = [];
    this.phase = 'play';
    this.doubled = false;

    this.dealCard(this.player, false);
    setTimeout(() => this.dealCard(this.dealer, false), 220);
    setTimeout(() => this.dealCard(this.player, false), 440);
    setTimeout(() => this.dealCard(this.dealer, true), 660);
    setTimeout(() => {
      this.renderHands();
      this.updateScores(true);
      if (val(this.player) === 21) {
        this.el.querySelector('#bjMsg').textContent = 'Блэкджек!';
        setTimeout(() => this.stand(), 500);
      } else {
        this.showPlayActions();
      }
    }, 880);
  };

  BJ.dealCard = function (hand, hidden) {
    const c = this.shoe.pop();
    c.hidden = hidden;
    hand.push(c);
    PixelAudio.play('cardDeal');
    this.renderHands();
  };

  BJ.renderHands = function () {
    const pc = this.el.querySelector('#playerCards');
    const dc = this.el.querySelector('#dealerCards');
    pc.innerHTML = this.player.map((c, i) => cardHtml(c, i)).join('');
    dc.innerHTML = this.dealer.map((c, i) => cardHtml(c, i)).join('');
  };

  function cardHtml(c, i) {
    if (c.hidden) return `<div class="card back" style="--i:${i}">🂠</div>`;
    return `<div class="card ${c.red ? 'red' : ''}" style="--i:${i}"><span class="c-r">${c.r}</span><span class="c-s">${c.s}</span></div>`;
  }

  BJ.updateScores = function (revealPlayerOnly) {
    const pv = val(this.player);
    const dVisible = this.dealer.filter((c) => !c.hidden);
    this.el.querySelector('#pVal').textContent = this.player.length ? pv : '';
    this.el.querySelector('#dVal').textContent =
      this.dealer.length && (!this.hasHidden() || !revealPlayerOnly === false)
        ? this.hasHidden()
          ? val(dVisible) + '+'
          : val(this.dealer)
        : this.dealer.length
        ? val(dVisible) + '+'
        : '';
  };

  BJ.hasHidden = function () {
    return this.dealer.some((c) => c.hidden);
  };

  BJ.showPlayActions = function () {
    const act = this.el.querySelector('#bjActions');
    const canDouble = Casino.canBet(this.bet) && this.player.length === 2;
    act.innerHTML = `
      <button class="btn-action hit" id="bjHit">ЕЩЁ</button>
      <button class="btn-action stand" id="bjStand">ХВАТИТ</button>
      ${canDouble ? '<button class="btn-action dbl" id="bjDouble">УДВОИТЬ</button>' : ''}`;
    this.el.querySelector('#bjHit').addEventListener('click', () => this.hit());
    this.el.querySelector('#bjStand').addEventListener('click', () => this.stand());
    const dbl = this.el.querySelector('#bjDouble');
    if (dbl) dbl.addEventListener('click', () => this.double());
  };

  BJ.hit = function () {
    if (this.phase !== 'play') return;
    PixelAudio.play('cardFlip');
    this.dealCard(this.player, false);
    this.updateScores(true);
    const v = val(this.player);
    if (v > 21) {
      this.finish('bust');
    } else if (v === 21) {
      this.stand();
    }
  };

  BJ.double = function () {
    if (!Casino.bet(this.bet)) {
      PixelAudio.play('error');
      return;
    }
    this.doubled = true;
    PixelAudio.play('chip');
    this.dealCard(this.player, false);
    this.updateScores(true);
    if (val(this.player) > 21) this.finish('bust');
    else this.stand();
  };

  BJ.stand = function () {
    this.phase = 'done';
    this.el.querySelector('#bjActions').innerHTML = '';
    // reveal dealer
    this.dealer.forEach((c) => (c.hidden = false));
    this.renderHands();
    PixelAudio.play('cardFlip');
    this.dealerPlay();
  };

  BJ.dealerPlay = function () {
    const step = () => {
      this.updateScores(false);
      this.el.querySelector('#dVal').textContent = val(this.dealer);
      if (val(this.dealer) < 17) {
        setTimeout(() => {
          this.dealCard(this.dealer, false);
          step();
        }, 600);
      } else {
        this.finish('compare');
      }
    };
    setTimeout(step, 500);
  };

  BJ.finish = function (reason) {
    this.phase = 'done';
    this.dealer.forEach((c) => (c.hidden = false));
    this.renderHands();
    this.el.querySelector('#dVal').textContent = val(this.dealer);
    this.el.querySelector('#pVal').textContent = val(this.player);

    const pv = val(this.player);
    const dv = val(this.dealer);
    const stake = this.bet * (this.doubled ? 2 : 1);
    const msg = this.el.querySelector('#bjMsg');
    let outcome, payout = 0;

    if (reason === 'bust' || pv > 21) {
      outcome = 'Перебор! Вы проиграли';
    } else if (pv === 21 && this.player.length === 2 && !(dv === 21 && this.dealer.length === 2)) {
      outcome = 'БЛЭКДЖЕК! 🎉';
      payout = stake + Math.floor(stake * 1.5);
    } else if (dv > 21) {
      outcome = 'Дилер перебрал! Вы выиграли 🎉';
      payout = stake * 2;
    } else if (pv > dv) {
      outcome = 'Вы выиграли! 🎉';
      payout = stake * 2;
    } else if (pv === dv) {
      outcome = 'Ничья — ставка возвращена';
      payout = stake;
    } else {
      outcome = 'Дилер выиграл';
    }

    msg.textContent = outcome;
    if (payout > 0) {
      Casino.win(payout);
      if (payout > stake) {
        PixelAudio.play(payout > stake * 2 ? 'bigWin' : 'win');
        Casino.confetti({ count: 70 });
      } else PixelAudio.play('chip');
    } else {
      PixelAudio.play('lose');
    }

    const act = this.el.querySelector('#bjActions');
    act.innerHTML = `<button class="btn-spin" id="bjAgain"><span>ЕЩЁ РАЗ</span></button>`;
    this.phase = 'bet';
    this.el.querySelector('#bjAgain').addEventListener('click', () => this.deal());
  };

  global.BJ = BJ;
})(window);
