/* =====================================================================
 *  Main — lobby, routing, header binding, bonus, settings
 * ===================================================================== */
(function (global) {
  'use strict';

  const App = {
    view: 'lobby',
    activeGame: null,
  };

  const GAMES = [
    { id: 'slots', name: 'Слоты', icon: '🎰', desc: '8 тематических автоматов', tag: 'ХИТ', cls: 'g-slots' },
    { id: 'roulette', name: 'Рулетка', icon: '🎡', desc: 'Европейская, до 36×', tag: '', cls: 'g-roulette' },
    { id: 'blackjack', name: 'Блэкджек', icon: '🃏', desc: 'Обыграй дилера до 21', tag: '', cls: 'g-bj' },
    { id: 'plinko', name: 'Плинко', icon: '⚪', desc: 'До 40× на физике', tag: 'NEW', cls: 'g-plinko' },
    { id: 'crash', name: 'Краш', icon: '🚀', desc: 'Забери до взрыва', tag: 'HOT', cls: 'g-crash' },
    { id: 'mines', name: 'Минёр', icon: '💎', desc: 'Алмазы против бомб', tag: '', cls: 'g-mines' },
    { id: 'wheel', name: 'Колесо Фортуны', icon: '🎯', desc: 'Крути на 50×', tag: '', cls: 'g-wheel' },
    { id: 'dice', name: 'Кости', icon: '🎲', desc: 'Больше / меньше', tag: '', cls: 'g-dice' },
    { id: 'coin', name: 'Монетка', icon: '🪙', desc: 'Орёл или решка', tag: '', cls: 'g-coin' },
    { id: 'baccarat', name: 'Баккара', icon: '🎴', desc: 'Игрок · Банкир · Ничья', tag: '', cls: 'g-bac' },
    { id: 'poker', name: 'Видеопокер', icon: '♠️', desc: 'Jacks or Better, до 250×', tag: 'NEW', cls: 'g-poker' },
    { id: 'hilo', name: 'Hi-Lo', icon: '🔼', desc: 'Выше или ниже, серия', tag: '', cls: 'g-hilo' },
    { id: 'keno', name: 'Кено', icon: '🔢', desc: 'Угадай числа, до 2000×', tag: '', cls: 'g-keno' },
    { id: 'scratch', name: 'Скрэтч-карты', icon: '🎟️', desc: 'Сотри и выиграй', tag: 'NEW', cls: 'g-scratch' },
    { id: 'sicbo', name: 'Сик Бо', icon: '🎲', desc: '3 кости, до 180×', tag: '', cls: 'g-sicbo' },
    { id: 'limbo', name: 'Лимбо', icon: '📈', desc: 'Цель-множитель', tag: 'HOT', cls: 'g-limbo' },
    { id: 'tower', name: 'Башня Дракона', icon: '🐉', desc: 'Поднимайся, избегай дракона', tag: 'HOT', cls: 'g-tower' },
  ];

  App.init = function () {
    Casino.load();
    this.bindHeader();
    Casino.onChange((st) => this.updateHeader(st));
    this.updateHeader(Casino.state);
    this.renderLobby();

    // first user gesture starts audio + music
    const kick = () => {
      PixelAudio.resume();
      if (PixelAudio.musicOn) PixelAudio.startMusic();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);

    // global hover sfx for buttons
    document.addEventListener(
      'pointerover',
      (e) => {
        const b = e.target.closest('button, .game-card');
        if (b && PixelAudio.ctx) PixelAudio.play('hover');
      },
      { passive: true }
    );

    window.addEventListener('resize', () => {
      const cv = document.getElementById('fx-canvas');
      if (cv) {
        cv.width = innerWidth;
        cv.height = innerHeight;
      }
    });
  };

  App.bindHeader = function () {
    document.getElementById('homeBtn').addEventListener('click', () => {
      PixelAudio.play('click');
      this.goLobby();
    });
    document.getElementById('muteBtn').addEventListener('click', (e) => {
      const m = PixelAudio.toggleMute();
      e.currentTarget.textContent = m ? '🔇' : '🔊';
      e.currentTarget.classList.toggle('off', m);
    });
    document.getElementById('musicBtn').addEventListener('click', (e) => {
      PixelAudio.resume();
      const on = PixelAudio.toggleMusic();
      e.currentTarget.textContent = on ? '🎵' : '🎵';
      e.currentTarget.classList.toggle('off', !on);
    });
    document.getElementById('bonusBtn').addEventListener('click', () => this.claimBonus());
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('Сбросить прогресс и вернуть 1000 кредитов?')) {
        PixelAudio.play('click');
        Casino.reset();
        Casino.toast('Прогресс сброшен', 'gold');
      }
    });
  };

  App.updateHeader = function (st) {
    const balEl = document.getElementById('balance');
    const prev = parseInt((balEl.dataset.val || st.balance).toString().replace(/\D/g, '')) || st.balance;
    Casino.animateNumber(balEl, prev, st.balance, 500);
    balEl.dataset.val = st.balance;

    document.getElementById('levelNum').textContent = st.level;
    const need = st.level * 100;
    document.getElementById('xpFill').style.width = Math.min(100, (st.xp / need) * 100) + '%';
    document.getElementById('bestWin').textContent = Casino.fmt(st.bestWin);

    const bonusBtn = document.getElementById('bonusBtn');
    bonusBtn.classList.toggle('pulse', st.balance < 100);
  };

  App.claimBonus = function () {
    const last = parseInt(localStorage.getItem('pixelCasino.lastBonus') || '0');
    const now = Date.now();
    const cooldown = 60 * 1000; // 1 minute for fun
    if (Casino.state.balance >= 100 && now - last < cooldown) {
      const left = Math.ceil((cooldown - (now - last)) / 1000);
      Casino.toast(`Бонус доступен при балансе < 100 или через ${left}с`, 'bad');
      PixelAudio.play('error');
      return;
    }
    const amount = 500 + Casino.state.level * 50;
    Casino.addBalance(amount);
    localStorage.setItem('pixelCasino.lastBonus', now.toString());
    PixelAudio.play('cashout');
    Casino.confetti({ count: 100 });
    Casino.toast(`🎁 Бонус +${Casino.fmt(amount)} кредитов!`, 'gold');
  };

  /* ----------------- lobby ----------------- */
  App.renderLobby = function () {
    this.view = 'lobby';
    this.closeActive();
    const root = document.getElementById('view');
    root.innerHTML = `
      <div class="lobby">
        <div class="hero">
          <h1 class="hero-title">PIXEL<span>CASINO</span></h1>
          <p class="hero-sub">Играй ради удовольствия · виртуальные кредиты · никаких реальных денег</p>
        </div>
        <div class="game-grid" id="gameGrid"></div>
        <footer class="lobby-foot">🎮 Развлекательное казино. Создано для веселья, не для азартных игр на деньги.</footer>
      </div>`;
    const grid = document.getElementById('gameGrid');
    GAMES.forEach((g, i) => {
      const card = document.createElement('div');
      card.className = 'game-card ' + g.cls;
      card.style.animationDelay = i * 0.05 + 's';
      card.innerHTML = `
        ${g.tag ? `<span class="card-tag tag-${g.tag.toLowerCase()}">${g.tag}</span>` : ''}
        <div class="card-glow"></div>
        <div class="card-icon">${g.icon}</div>
        <div class="card-name">${g.name}</div>
        <div class="card-desc">${g.desc}</div>
        <div class="card-play">ИГРАТЬ ▶</div>`;
      card.addEventListener('click', () => {
        PixelAudio.play('click');
        this.openGame(g.id);
      });
      grid.appendChild(card);
    });
  };

  App.goLobby = function () {
    this.renderLobby();
  };

  App.closeActive = function () {
    if (this.activeGame === 'plinko' && global.Plinko) Plinko.close();
    if (this.activeGame === 'crash' && global.Crash) Crash.close();
    this.activeGame = null;
  };

  /* ----------------- open a game ----------------- */
  App.openGame = function (id) {
    this.view = 'game';
    if (id === 'slots') {
      this.renderSlotPicker();
      return;
    }
    this.mountGame(id, GAMES.find((g) => g.id === id).name);
  };

  App.renderSlotPicker = function () {
    const root = document.getElementById('view');
    root.innerHTML = `
      <div class="game-page">
        <button class="back-btn" id="backBtn">◀ В лобби</button>
        <h2 class="page-title">🎰 Выбор автомата</h2>
        <div class="slot-picker" id="slotPicker"></div>
      </div>`;
    document.getElementById('backBtn').addEventListener('click', () => {
      PixelAudio.play('click');
      this.goLobby();
    });
    const picker = document.getElementById('slotPicker');
    Slots.listMachines().forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'machine-card ' + m.theme;
      card.style.animationDelay = i * 0.04 + 's';
      card.innerHTML = `
        <div class="mc-icon">${m.icon}</div>
        <div class="mc-name">${m.name}</div>
        <div class="mc-tag">${m.tag}</div>
        <div class="mc-spec">${m.reels}×${m.rows} · до ×${Math.max(...m.symbols.map((s) => s.p[s.p.length - 1]))}</div>`;
      card.addEventListener('click', () => {
        PixelAudio.play('coin');
        this.mountSlot(m.id);
      });
      picker.appendChild(card);
    });
  };

  App.mountSlot = function (machineId) {
    this.activeGame = 'slots';
    const root = document.getElementById('view');
    root.innerHTML = `
      <div class="game-page">
        <button class="back-btn" id="backBtn">◀ Автоматы</button>
        <div class="game-host" id="gameHost"></div>
      </div>`;
    document.getElementById('backBtn').addEventListener('click', () => {
      PixelAudio.play('click');
      this.renderSlotPicker();
    });
    Slots.open(document.getElementById('gameHost'), machineId);
  };

  App.mountGame = function (id, title) {
    this.closeActive();
    this.activeGame = id;
    const root = document.getElementById('view');
    root.innerHTML = `
      <div class="game-page">
        <button class="back-btn" id="backBtn">◀ В лобби</button>
        <h2 class="page-title">${GAMES.find((g) => g.id === id).icon} ${title}</h2>
        <div class="game-host" id="gameHost"></div>
      </div>`;
    document.getElementById('backBtn').addEventListener('click', () => {
      PixelAudio.play('click');
      this.goLobby();
    });
    const host = document.getElementById('gameHost');
    const map = {
      roulette: Roulette, blackjack: BJ, plinko: Plinko, crash: Crash, mines: Mines,
      wheel: Wheel, dice: Dice, coin: Coin, baccarat: Baccarat, poker: Poker,
      hilo: HiLo, keno: Keno, scratch: Scratch, sicbo: SicBo, limbo: Limbo, tower: Tower,
    };
    map[id].open(host);
  };

  global.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})(window);
