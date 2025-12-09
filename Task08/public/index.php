<?php

declare(strict_types=1);

use App\Api;

$uriPath = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '', '/');
$isApi = preg_match('#^(games(?:/\d+)?|step/\d+)$#', $uriPath) === 1;

require_once __DIR__ . '/../src/Api.php';

if (!$isApi) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$parts  = explode('/', $uriPath);

try {
    // GET /games — список игр
    if ($method === 'GET' && $uriPath === 'games') {
        $stmt = Api::db()->query(
            'SELECT id, played_at, player_name, secret, outcome, attempts_count
             FROM games ORDER BY id DESC'
        );
        Api::respond(200, $stmt->fetchAll());
    }

    // GET /games/{id} — игра с попытками
    if ($method === 'GET' && $parts[0] === 'games' && isset($parts[1]) && ctype_digit($parts[1])) {
        $id  = (int)$parts[1];
        $pdo = Api::db();

        $stmt = $pdo->prepare(
            'SELECT id, played_at, player_name, secret, outcome, attempts_count
             FROM games WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $game = $stmt->fetch();
        if (!$game) {
            Api::respond(404, ['error' => 'Game not found']);
        }

        $stmt = $pdo->prepare(
            'SELECT turn, guess, hints
             FROM attempts WHERE game_id = :id ORDER BY turn ASC'
        );
        $stmt->execute([':id' => $id]);
        $game['attempts'] = $stmt->fetchAll();

        Api::respond(200, $game);
    }

    // POST /games — создать игру
    if ($method === 'POST' && $uriPath === 'games') {
        $in     = Api::jsonInput();
        $player = trim((string)($in['player_name'] ?? 'Player'));
        $secret = trim((string)($in['secret'] ?? ''));

        if ($secret === '' || strlen($secret) !== 3) {
            Api::respond(400, ['error' => 'Invalid secret']);
        }

        $stmt = Api::db()->prepare(
            'INSERT INTO games (played_at, player_name, secret, outcome, attempts_count)
             VALUES (:played_at, :player_name, :secret, "in_progress", 0)'
        );
        $stmt->execute([
            ':played_at'   => date('Y-m-d H:i:s'),
            ':player_name' => $player,
            ':secret'      => $secret,
        ]);
        Api::respond(201, ['id' => (int)Api::db()->lastInsertId()]);
    }

    // POST /step/{id} — добавить ход
    if ($method === 'POST' && $parts[0] === 'step' && isset($parts[1]) && ctype_digit($parts[1])) {
        $id  = (int)$parts[1];
        $in  = Api::jsonInput();
        $pdo = Api::db();

        $turn  = (int)($in['turn'] ?? 0);
        $guess = (string)($in['guess'] ?? '');
        $hints = $in['hints'] ?? '';
        if (is_array($hints)) {
            $hints = implode(' ', $hints);
        }
        $hints = trim((string)$hints);

        if ($turn <= 0 || $guess === '' || $hints === '') {
            Api::respond(400, ['error' => 'Invalid step payload']);
        }

        $has = $pdo->prepare('SELECT id FROM games WHERE id = :id');
        $has->execute([':id' => $id]);
        if (!$has->fetchColumn()) {
            Api::respond(404, ['error' => 'Game not found']);
        }

        // Ход
        $ins = $pdo->prepare(
            'INSERT INTO attempts (game_id, turn, guess, hints)
             VALUES (:game_id, :turn, :guess, :hints)'
        );
        $ins->execute([
            ':game_id' => $id,
            ':turn'    => $turn,
            ':guess'   => $guess,
            ':hints'   => $hints,
        ]);

        $upd = $pdo->prepare(
            'UPDATE games
             SET attempts_count = CASE WHEN attempts_count < :cnt THEN :cnt ELSE attempts_count END
             WHERE id = :id'
        );
        $upd->execute([':cnt' => $turn, ':id' => $id]);

        if (isset($in['outcome']) && in_array($in['outcome'], ['win', 'lose', 'in_progress'], true)) {
            $ou = $pdo->prepare('UPDATE games SET outcome = :o WHERE id = :id');
            $ou->execute([':o' => $in['outcome'], ':id' => $id]);
        }

        Api::respond(201, ['ok' => true]);
    }

    // Неизвестный маршрут
    Api::respond(404, ['error' => 'Not found']);
} catch (Throwable $e) {
    Api::respond(500, ['error' => 'Server error', 'detail' => $e->getMessage()]);
}
