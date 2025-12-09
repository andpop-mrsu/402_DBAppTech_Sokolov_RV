(() => {
  const $ = (sel) => document.querySelector(sel);
  const show = (el) => el && el.classList.remove('hidden');
  const hide = (el) => el && el.classList.add('hidden');
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  const screens = {
    game: $('#screen-game'),
    history: $('#screen-history'),
    help: $('#screen-help'),
  };

  function nav(to) {
    Object.values(screens).forEach(hide);
    show(screens[to]);
  }

  function replayById(id) {
    if (!/^\d+$/.test(String(id))) {
      alert('Некорректный ID');
      return;
    }
    API.getGame(id).then((data) => {
      if (!data) {
        alert('Партия не найдена');
        return;
      }
      show(replayArea);
      replayId.textContent = data.id;
      replayPlayer.textContent = data.player_name;
      replaySecret.textContent = data.secret;
      replayOutcome.textContent = data.outcome;
      replayAttempts.textContent = data.attempts_count;
      replayBody.innerHTML = '';
      for (const a of data.attempts) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${a.turn}</td><td>${a.guess}</td><td>${a.hints}</td>`;
        replayBody.appendChild(tr);
      }
    }).catch((e) => alert('Ошибка запроса игры: ' + (e?.message || e)));
  }

  function route() {
    const h = (location.hash || '#game').toLowerCase();

    if (h.startsWith('#replay-')) {
      const id = h.slice('#replay-'.length);
      nav('history');
      refreshHistory().then(() => replayById(id));
      return;
    }

    switch (h) {
      case '#history':
        nav('history');
        refreshHistory();
        break;
      case '#help':
        nav('help');
        break;
      case '#game':
      default:
        nav('game');
        break;
    }
  }

  let game = null;
  let gameId = null;

  const playerName = $('#playerName');
  const btnStart = $('#btnStart');
  const playArea = $('#playArea');
  const guessInput = $('#guessInput');
  const btnGuess = $('#btnGuess');
  const btnGiveUp = $('#btnGiveUp');
  const logBody = $('#logBody');
  const lastHints = $('#lastHints');
  const finalResult = $('#finalResult');

  const historyBody = $('#historyBody');
  const btnRefresh = $('#btnRefresh');
  const btnClearDB = $('#btnClearDB');
  const replayArea = $('#replayArea');
  const replayId = $('#replayId');
  const replayPlayer = $('#replayPlayer');
  const replaySecret = $('#replaySecret');
  const replayOutcome = $('#replayOutcome');
  const replayAttempts = $('#replayAttempts');
  const replayBody = $('#replayBody');

  const replayIdInput = $('#replayIdInput');
  const btnReplayId = $('#btnReplayId');

  on(window, 'hashchange', route);
  on(document, 'DOMContentLoaded', route);

  on(btnStart, 'click', async () => {
    game = new Game((playerName?.value || '').trim() || 'Player');
    if (logBody) logBody.innerHTML = '';
    if (lastHints) lastHints.textContent = '';
    if (finalResult) { finalResult.textContent = ''; hide(finalResult); }
    show(playArea);
    if (guessInput) { guessInput.value = ''; guessInput.focus(); }

    // Создаём игру на сервере
    gameId = null;
    try {
      const { id } = await API.createGame(game.player, game.secret);
      gameId = id;
    } catch (e) {
      console.warn('Не удалось создать игру на сервере:', e);
      alert('Не удалось создать игру на сервере: ' + (e?.message || e));
    }
  });

  function renderLast(res, raw) {
    if (lastHints) lastHints.textContent = `Подсказки: ${res.hints}`;
    if (logBody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${game.attempts}</td><td>${raw}</td><td>${res.hints}</td>`;
      logBody.appendChild(tr);
    }
  }

  async function onGuess() {
    if (!game) return;
    const raw = (guessInput?.value || '').trim();
    if (raw.toLowerCase() === 'exit') {
      game.isOver = true; game.won = false;
      await finalizeGame();
      return;
    }
    const res = game.makeGuess(raw);
    if (!res.ok) {
      if (lastHints) lastHints.textContent = res.error;
      return;
    }

    renderLast(res, raw);

    // Шаг на сервер
    if (gameId) {
      try {
        await API.addStep(gameId, {
          turn: game.attempts,
          guess: raw,
          hints: res.hints.split(' '),
        });
      } catch (e) {
        console.warn('Не удалось сохранить шаг:', e);
      }
    }

    if (guessInput) { guessInput.value = ''; guessInput.focus(); }
    if (game.isOver) await finalizeGame();
  }

  on(btnGuess, 'click', onGuess);
  on(guessInput, 'keydown', (e) => {
    if (e.key === 'Enter') onGuess();
  });

  on(btnGiveUp, 'click', async () => {
    if (!game) return;
    game.isOver = true;
    game.won = false;
    await finalizeGame();
  });

  async function finalizeGame() {
    show(finalResult);
    if (finalResult) {
      finalResult.textContent = game.won
        ? `Поздравляем! Загаданное число: ${game.secret}. Попыток: ${game.attempts}.`
        : `Игра окончена. Секрет: ${game.secret}.`;
    }

    if (gameId) {
      try {
        // Передаём исход
        await API.addStep(gameId, {
          turn: game.attempts,
          guess: game.log.at(-1)?.guess ?? '',
          hints: (game.log.at(-1)?.hints ?? '').split(' '),
          outcome: game.won ? 'win' : 'lose'
        });
        if (finalResult) finalResult.textContent += ` Игра сохранена на сервере. ID: ${gameId}.`;
      } catch (e) {
        if (finalResult) finalResult.textContent += ` Не удалось сохранить на сервере: ${e?.message || e}`;
      }
    } else {
      if (finalResult) finalResult.textContent += ` Игра не была зарегистрирована на сервере.`;
    }
  }

  async function refreshHistory() {
    if (historyBody) historyBody.innerHTML = '';
    hide(replayArea);
    let rows = [];
    try {
      rows = await API.listGames();
    } catch (e) {
      if (historyBody)
        historyBody.innerHTML = `<tr><td colspan="7" class="muted">Ошибка запроса /games: ${e?.message || e}</td></tr>`;
      return;
    }
    if (!rows.length) {
      if (historyBody)
        historyBody.innerHTML = `<tr><td colspan="7" class="muted">На сервере ещё нет сохранённых партий</td></tr>`;
      return;
    }
    for (const g of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${g.id}</td>
        <td>${g.played_at}</td>
        <td>${escapeHtml(g.player_name)}</td>
        <td>${g.secret}</td>
        <td>${g.outcome}</td>
        <td>${g.attempts_count}</td>
        <td><button data-id="${g.id}" class="replay">Повтор</button></td>
      `;
      historyBody?.appendChild(tr);
    }

    on(historyBody, 'click', async (ev) => {
      const btn = ev.target.closest('button.replay');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      try {
        const data = await API.getGame(id);
        show(replayArea);
        replayId.textContent = data.id;
        replayPlayer.textContent = data.player_name;
        replaySecret.textContent = data.secret;
        replayOutcome.textContent = data.outcome;
        replayAttempts.textContent = data.attempts_count;
        replayBody.innerHTML = '';
        for (const a of data.attempts) {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${a.turn}</td><td>${a.guess}</td><td>${a.hints}</td>`;
          replayBody.appendChild(tr);
        }
      } catch (e) {
        alert('Ошибка запроса игры: ' + (e?.message || e));
      }
    });
  }

  on(btnRefresh, 'click', refreshHistory);
  on(btnClearDB, 'click', async () => {
    if (!confirm('Точно очистить локальную БД?')) return;
    if (historyBody) historyBody.innerHTML = `<tr><td colspan="7" class="muted">БД очищается на сервере вручную</td></tr>`;
  });

  on(btnReplayId, 'click', (e) => {
    e.preventDefault();
    const id = (replayIdInput?.value || '').trim();
    if (!id) return;
    location.hash = `#replay-${id}`;
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  // Стартовый экран
  nav('game');
  route();
})();

