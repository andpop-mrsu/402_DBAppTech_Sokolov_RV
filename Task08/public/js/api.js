const API = {
  async createGame(player_name, secret) {
    const r = await fetch('/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name, secret })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json(); // { id }
  },

  async addStep(id, { turn, guess, hints, outcome }) {
    const r = await fetch(`/step/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turn, guess, hints, outcome })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  async listGames() {
    const r = await fetch('/games');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  async getGame(id) {
    const r = await fetch(`/games/${id}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
};

window.API = API;
