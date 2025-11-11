<?php

namespace sokol\ColdHot;

class View
{
    public static function renderStartScreen()
    {
        if (function_exists('\cli\line')) {
            \cli\line("=== Игра 'Холодно-Горячо' ===");
            \cli\line("Меню:");
            \cli\line("1) Начать новую игру");
            \cli\line("2) Таблица рекордов");
            \cli\line("3) Правила игры");
            \cli\line("4) Повтор сохранённой партии");
            \cli\line("5) Выход");
            \cli\line("");
        } else {
            echo "=== Игра 'Холодно-Горячо' ===\n";
            echo "Меню:\n";
            echo "1) Начать новую игру\n";
            echo "2) Таблица рекордов\n";
            echo "3) Правила игры\n";
            echo "4) Повтор сохранённой партии\n\n";
            echo "5) Выход\n\n";
        }
    }

    public static function showMessage(string $msg): void
    {
        echo $msg . PHP_EOL;
    }

    public static function prompt(string $text): string
    {
        echo $text;
        return trim(fgets(STDIN));
    }

    public static function renderRules(): void
    {
        self::showMessage("Правила игры 'Холодно-Горячо':");
        self::showMessage("Компьютер загадывает трёхзначное число без повторов.");
        self::showMessage("После каждой попытки даются подсказки:");
        self::showMessage("- Холодно: ни одной цифры нет в числе");
        self::showMessage("- Тепло: цифра есть, но не на своём месте");
        self::showMessage("- Горячо: цифра и место угаданы");
    }
}
