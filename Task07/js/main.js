const $ = (sel) => document.querySelector(sel);
const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');

const screens = {
  game: $('#screen-game'),
  history: $('#screen-history'),
  help: $('#screen-help'),
};

function nav(to) {
  Object.values(screens).forEach(hide);
  show(screens[to]);
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

function replayById(id) {
  if (!/^\d+$/.test(String(id))) {
    alert('Некорректный ID');
    return;
  }
  getGame(id).then((data) => {
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
  });
}

// game state
let game = null;

// UI refs
const playerName = $('#playerName');
const btnStart = $('#btnStart');
const playArea = $('#playArea');
const guessInput = $('#guessInput');
const btnGuess = $('#btnGuess');
const btnGiveUp = $('#btnGiveUp');
const logBody = $('#logBody');
const lastHints = $('#lastHints');
const finalResult = $('#finalResult');

// Старт роутера
window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);

// Новая игра
btnStart.addEventListener('click', () => {
  game = new Game(playerName.value.trim() || 'Player');
  logBody.innerHTML = '';
  lastHints.textContent = '';
  finalResult.textContent = '';
  hide(finalResult);
  show(playArea);
  guessInput.value = '';
  guessInput.focus();
});

// Ход
btnGuess.addEventListener('click', onGuess);
guessInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') onGuess();
});

btnGiveUp.addEventListener('click', async () => {
  if (!game) return;
  game.isOver = true;
  game.won = false;
  await finalizeGame();
});

function onGuess() {
  if (!game) return;
  const raw = guessInput.value.trim();
  if (raw.toLowerCase() === 'exit') {
    game.isOver = true; game.won = false;
    finalizeGame(); return;
  }
  const res = game.makeGuess(raw);
  if (!res.ok) {
    lastHints.textContent = res.error;
    return;
  }

  lastHints.textContent = `Подсказки: ${res.hints}`;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${game.attempts}</td><td>${raw}</td><td>${res.hints}</td>`;
  logBody.appendChild(tr);

  guessInput.value = '';
  guessInput.focus();

  if (game.isOver) {
    finalizeGame();
  }
}

async function finalizeGame() {
  show(finalResult);
  finalResult.textContent = game.won
    ? `Поздравляем! Загаданное число: ${game.secret}. Попыток: ${game.attempts}.`
    : `Игра окончена. Секрет: ${game.secret}.`;

  try {
    const id = await saveGame(game);
    finalResult.textContent += ` Игра сохранена. ID: ${id}.`;
  } catch (e) {
    finalResult.textContent += ` Не удалось сохранить игру: ${e?.message || e}`;
  }
}

// История / Повтор
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

btnRefresh.addEventListener('click', refreshHistory);
btnClearDB.addEventListener('click', async () => {
  if (!confirm('Точно очистить локальную БД?')) return;
  await clearDB();
  await refreshHistory();
});

async function refreshHistory() {
  historyBody.innerHTML = '';
  hide(replayArea);
  const rows = await listGames();
  if (!rows.length) {
    historyBody.innerHTML = `<tr><td colspan="7" class="muted">В базе ещё нет сохранённых партий</td></tr>`;
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
    historyBody.appendChild(tr);
  }

  historyBody.querySelectorAll('button.replay').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const data = await getGame(id);
      if (!data) return;
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
    });
  });
}

const replayIdInput = $('#replayIdInput');
const btnReplayId = $('#btnReplayId');

btnReplayId.addEventListener('click', (e) => {
  e.preventDefault();
  const id = (replayIdInput.value || '').trim();
  if (!id) return;
  location.hash = `#replay-${id}`;
});

// helpers
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

// Стартовый экран
nav('game');
