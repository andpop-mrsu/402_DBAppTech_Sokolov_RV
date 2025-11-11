// Логика игры "Холодно-Горячо"
class Game {
  constructor(playerName = "Player") {
    this.player = playerName || "Player";
    this.secret = Game.generateSecret(); // строка из 3 уникальных цифр, первая ≠ 0
    this.attempts = 0;
    this.isOver = false;
    this.won = false;
    this.log = []; // [{turn, guess, hints: "Горячо Тепло Тепло"}]
  }

  static generateSecret() {
    const digits = ['0','1','2','3','4','5','6','7','8','9'];
    // перемешаем
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    // первая цифра не должна быть 0
    if (digits[0] === '0') {
      const k = digits.findIndex(d => d !== '0');
      [digits[0], digits[k]] = [digits[k], digits[0]];
    }
    return digits.slice(0, 3).join('');
  }

  static isValidGuess(s) {
    return /^\d{3}$/.test(s) && new Set(s.split('')).size === 3;
  }

  // Возвращает массив из ТРЁХ подсказок (по одной на каждую цифру), отсортированных по-русски
  static getHints(secret, guess) {
    const hints = [];
    for (let i = 0; i < 3; i++) {
      if (guess[i] === secret[i]) {
        hints.push('Горячо');
      } else if (secret.includes(guess[i])) {
        hints.push('Тепло');
      } else {
        hints.push('Холодно');
      }
    }
    hints.sort((a, b) => a.localeCompare(b, 'ru'));
    return hints;
  }

  // Один ход. Возвращает {ok, error?, hints?}
  makeGuess(guess) {
    if (!Game.isValidGuess(guess)) {
      return { ok: false, error: 'Введите трёхзначное число без повторяющихся цифр' };
    }
    this.attempts += 1;

    const hintsArr = Game.getHints(this.secret, guess);
    const hintsStr = hintsArr.join(' ');
    this.log.push({ turn: this.attempts, guess, hints: hintsStr });

    if (guess === this.secret) {
      this.isOver = true;
      this.won = true;
    }
    return { ok: true, hints: hintsStr };
  }
}

window.Game = Game;