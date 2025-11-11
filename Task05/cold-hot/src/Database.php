<?php

namespace sokol\ColdHot;

use RedBeanPHP\R as R;

class Database
{
    private string $dbPath;

    public function __construct(?string $dbPath = null)
    {
        $this->dbPath = $dbPath ?? (__DIR__ . '/../data/coldhot.sqlite');

        $dir = dirname($this->dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        if (!R::hasDatabase('default')) {
            R::addDatabase('default', 'sqlite:' . $this->dbPath);
        }
        R::selectDatabase('default');
        R::freeze(false);
    }

    public function saveGame(string $player, string $secret, bool $won, int $attemptsCount, array $log): int
    {
        // Бин игры
        $game = R::dispense('game');
        $game->played_at      = date('Y-m-d H:i:s');
        $game->player_name    = $player;
        $game->secret         = $secret;
        $game->outcome        = $won ? 'win' : 'lose';
        $game->attempts_count = $attemptsCount;

        $game->ownAttemptList = [];
        foreach ($log as $row) {
            $attempt = R::dispense('attempt');
            $attempt->turn  = (int)($row['turn'] ?? 0);
            $attempt->guess = (string)($row['guess'] ?? '');
            $hints          = $row['hints'] ?? '';
            if (is_array($hints)) {
                $hints = implode(' ', $hints);
            }
            $attempt->hints = (string)$hints;

            $game->ownAttemptList[] = $attempt;
        }

        // Сохраняем игру вместе с дочерними попытками
        $id = (int) R::store($game);

        return $id;
    }

    public function listGames(): array
    {
        $beans = R::findAll('game', ' ORDER BY id DESC ');
        $rows  = [];

        foreach ($beans as $g) {
            $rows[] = [
                'id'             => (int)$g->id,
                'played_at'      => (string)$g->played_at,
                'player_name'    => (string)$g->player_name,
                'secret'         => (string)$g->secret,
                'outcome'        => (string)$g->outcome,
                'attempts_count' => (int)$g->attempts_count,
            ];
        }
        return $rows;
    }

    public function getGame(int $id): ?array
    {
        $g = R::load('game', $id);
        if (!$g || $g->id === 0) {
            return null;
        }

        $attempts = R::findAll('attempt', ' game_id = ? ORDER BY turn ASC ', [$id]);

        $out = [
            'id'             => (int)$g->id,
            'played_at'      => (string)$g->played_at,
            'player_name'    => (string)$g->player_name,
            'secret'         => (string)$g->secret,
            'outcome'        => (string)$g->outcome,
            'attempts_count' => (int)$g->attempts_count,
            'attempts'       => [],
        ];

        foreach ($attempts as $a) {
            $out['attempts'][] = [
                'turn'  => (int)$a->turn,
                'guess' => (string)$a->guess,
                'hints' => (string)$a->hints,
            ];
        }

        return $out;
    }
}
