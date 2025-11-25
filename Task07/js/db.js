// IndexedDB: games + attempts
const DB_NAME = 'coldhot-db';
const DB_VERSION = 1;
const STORE_GAMES = 'games';
const STORE_ATTEMPTS = 'attempts';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        db.createObjectStore(STORE_GAMES, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
        const store = db.createObjectStore(STORE_ATTEMPTS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('gameId', 'gameId', { unique: false });
        store.createIndex('turn', 'turn', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

// utils
function tx(db, storeNames, mode = 'readonly') {
  return db.transaction(storeNames, mode);
}

async function saveGame(game) {
  // game: { player, secret, won, attempts, log: [{turn, guess, hints}] }
  const db = await openDB();
  const t = tx(db, [STORE_GAMES, STORE_ATTEMPTS], 'readwrite');
  const games = t.objectStore(STORE_GAMES);
  const attempts = t.objectStore(STORE_ATTEMPTS);

  const base = {
    played_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    player_name: game.player,
    secret: game.secret,
    outcome: game.won ? 'win' : 'lose',
    attempts_count: game.attempts
  };

  const id = await new Promise((resolve, reject) => {
    const r = games.add(base);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

  // attempts
  for (const row of game.log) {
    await new Promise((resolve, reject) => {
      const r = attempts.add({
        gameId: id,
        turn: row.turn,
        guess: row.guess,
        hints: row.hints
      });
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  await new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

  return id;
}

async function listGames() {
  const db = await openDB();
  const t = tx(db, [STORE_GAMES], 'readonly');
  const store = t.objectStore(STORE_GAMES);

  const rows = await new Promise((resolve, reject) => {
    const res = [];
    const req = store.openCursor(null, 'prev'); // по убыванию id
    req.onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) {
        res.push(cur.value);
        cur.continue();
      } else resolve(res);
    };
    req.onerror = () => reject(req.error);
  });

  return rows;
}

async function getGame(id) {
  const db = await openDB();
  const t = tx(db, [STORE_GAMES, STORE_ATTEMPTS], 'readonly');
  const games = t.objectStore(STORE_GAMES);
  const attempts = t.objectStore(STORE_ATTEMPTS);
  const idx = attempts.index('gameId');

  const game = await new Promise((resolve, reject) => {
    const r = games.get(Number(id));
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
  if (!game) return null;

  const rows = await new Promise((resolve, reject) => {
    const res = [];
    const range = IDBKeyRange.only(Number(id));
    const req = idx.openCursor(range, 'next');
    req.onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) {
        res.push(cur.value);
        cur.continue();
      } else resolve(res.sort((a,b)=>a.turn-b.turn));
    };
    req.onerror = () => reject(req.error);
  });

  game.attempts = rows;
  return game;
}

async function clearDB() {
  const db = await openDB();
  const t = tx(db, [STORE_GAMES, STORE_ATTEMPTS], 'readwrite');
  t.objectStore(STORE_GAMES).clear();
  t.objectStore(STORE_ATTEMPTS).clear();
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

window.DB = { saveGame, listGames, getGame, clearDB };