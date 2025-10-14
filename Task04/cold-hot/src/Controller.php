<?php

namespace sokol\ColdHot;

function startGame()
{
    View::renderStartScreen();

    while (true) {
        $choice = View::prompt("Ваш выбор > ");

        switch ($choice) {
            case '1':
                $player = View::prompt("Введите имя игрока (Enter — по умолчанию 'Player') > ");
                if ($player === '') {
                    $player = 'Player';
                }

                $game = new Game();
                $game->play();

                try {
                    $db = new Database();
                    $gameId = $db->saveGame(
                        $player,
                        $game->getSecretNumber(),
                        $game->isWon(),
                        $game->getAttempts(),
                        $game->getLog()
                    );
                    View::showMessage("Игра сохранена в базе. ID: {$gameId}");
                } catch (\Throwable $e) {
                    View::showMessage("Не удалось сохранить игру: " . $e->getMessage());
                }

                break;
            case '2':
                listGames();
                break;

            case '3':
                if (method_exists(View::class, 'renderRules')) {
                    View::renderRules();
                } else {
                    View::showMessage("Правила: компьютер загадывает 3-значное число без повторов...");
                }
                break;

            case '4':
                replayGame();
                break;

            case '5':
                View::showMessage("Выход из игры.");
                return;

            default:
                View::showMessage("Неверный выбор, попробуйте снова.");
        }
    }
}

function listGames(): void
{
    try {
        $db = new Database();
        $rows = $db->listGames();

        if (!$rows) {
            View::showMessage("В базе ещё нет сохранённых партий.");
            return;
        }

        View::showMessage("ID | Дата             | Игрок    | Секрет | Исход | Попыток");
        View::showMessage(str_repeat('-', 64));
        foreach ($rows as $r) {
            View::showMessage(sprintf(
                "%-2d | %-16s | %-8s | %-6s | %-5s | %-7d",
                $r['id'],
                $r['played_at'],
                $r['player_name'],
                $r['secret'],
                $r['outcome'],
                $r['attempts_count']
            ));
        }
    } catch (\Throwable $e) {
        View::showMessage("Ошибка чтения БД: " . $e->getMessage());
    }
}

function replayGame(): void
{
    $idStr = View::prompt("Введите ID партии для повтора > ");
    if (!ctype_digit($idStr)) {
        View::showMessage("Некорректный ID.");
        return;
    }

    try {
        $db   = new Database();
        $game = $db->getGame((int)$idStr);

        if (!$game) {
            View::showMessage("Партия не найдена.");
            return;
        }

        View::showMessage("Партия #{$game['id']} от {$game['played_at']}");
        View::showMessage("Игрок: {$game['player_name']}, секрет: {$game['secret']}, исход: {$game['outcome']}");
        View::showMessage("Ходы:");
        foreach ($game['attempts'] as $a) {
            View::showMessage(sprintf("%d) %s  →  %s", $a['turn'], $a['guess'], $a['hints']));
        }
    } catch (\Throwable $e) {
        View::showMessage("Ошибка повтора: " . $e->getMessage());
    }
}
