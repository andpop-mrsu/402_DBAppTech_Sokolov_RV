<?php

namespace sokol\ColdHot;

use PDO;
use PDOException;

class Database
{
    private PDO $pdo;

    public function __construct(?string $dbPath = null)
    {
        $dbPath ??= __DIR__ . '/../data/coldhot.sqlite';
        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $this->pdo = new PDO('sqlite:' . $dbPath);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->ensureSchema();
    }

    private function ensureSchema(): void
    {
        $this->pdo->exec('CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            played_at TEXT NOT NULL,
            player_name TEXT NOT NULL,
            secret TEXT NOT NULL,
            outcome TEXT NOT NULL,   -- win | lose
            attempts_count INTEGER NOT NULL
        )');

        $this->pdo->exec('CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            turn INTEGER NOT NULL,
            guess TEXT NOT NULL,
            hints TEXT NOT NULL,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        )');
    }

    public function saveGame(string $player, string $secret, bool $won, int $attemptsCount, array $log): int
    {
        $this->pdo->beginTransaction();

        $stmt = $this->pdo->prepare(
            'INSERT INTO games (played_at, player_name, secret, outcome, attempts_count)
             VALUES (:played_at, :player_name, :secret, :outcome, :attempts)'
        );
        $stmt->execute([
            ':played_at'   => date('Y-m-d H:i:s'),
            ':player_name' => $player,
            ':secret'      => $secret,
            ':outcome'     => $won ? 'win' : 'lose',
            ':attempts'    => $attemptsCount,
        ]);
        $gameId = (int)$this->pdo->lastInsertId();

        if (!empty($log)) {
            $att = $this->pdo->prepare(
                'INSERT INTO attempts (game_id, turn, guess, hints)
                 VALUES (:game_id, :turn, :guess, :hints)'
            );
            foreach ($log as $row) {
                $att->execute([
                    ':game_id' => $gameId,
                    ':turn'    => (int)$row['turn'],
                    ':guess'   => (string)$row['guess'],
                    ':hints'   => is_array($row['hints']) ? implode(' ', $row['hints']) : (string)$row['hints'],
                ]);
            }
        }

        $this->pdo->commit();
        return $gameId;
    }

    public function listGames(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id, played_at, player_name, secret, outcome, attempts_count
             FROM games ORDER BY id DESC'
        );
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getGame(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM games WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $game = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$game) {
            return null;
        }

        $stmt2 = $this->pdo->prepare(
            'SELECT turn, guess, hints
             FROM attempts WHERE game_id = :id ORDER BY turn ASC'
        );
        $stmt2->execute([':id' => $id]);
        $game['attempts'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        return $game;
    }
}
