<?php

declare(strict_types=1);

namespace App;

use PDO;

final class Api
{
    public static function respond(int $code, $data = null): void
    {
        http_response_code($code);
        if ($data !== null) {
            echo json_encode(
                $data,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );
        }
        exit;
    }

    public static function jsonInput(): array
    {
        $raw  = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    public static function db(): PDO
    {
        static $pdo;
        if ($pdo) {
            return $pdo;
        }

        // Проверка доступности pdo_sqlite
        $pdoSqliteAvailable = extension_loaded('pdo_sqlite')
            && in_array('sqlite', PDO::getAvailableDrivers(), true);

        if (!$pdoSqliteAvailable) {
            self::respond(500, [
                'error' => 'PDO SQLite driver is not available. '
                    . 'Enable the pdo_sqlite extension in php.ini.',
            ]);
        }

        // Каталог БД
        $dbDir = dirname(__DIR__) . '/db';
        if (!is_dir($dbDir) && !mkdir($dbDir, 0777, true) && !is_dir($dbDir)) {
            self::respond(500, [
                'error' => "Failed to create DB directory: {$dbDir}",
            ]);
        }
        if (!is_writable($dbDir)) {
            self::respond(500, [
                'error' => "DB directory is not writable: {$dbDir}",
            ]);
        }

        $pdo = new PDO(
            'sqlite:' . $dbDir . '/coldhot.sqlite',
            null,
            null,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );

        self::ensureSchema($pdo);
        return $pdo;
    }

    private static function ensureSchema(PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                played_at TEXT NOT NULL,
                player_name TEXT NOT NULL,
                secret TEXT NOT NULL,
                outcome TEXT NOT NULL DEFAULT "in_progress",
                attempts_count INTEGER NOT NULL DEFAULT 0
            )'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                turn INTEGER NOT NULL,
                guess TEXT NOT NULL,
                hints TEXT NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            )'
        );
    }
}
