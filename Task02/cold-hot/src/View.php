<?php
namespace sokol\ColdHot\View;

class View {
    public static function renderStartScreen() {
        if (function_exists('\cli\line')) {
            \cli\line("=== Игра 'Холодно-Горячо' ===");
            \cli\line("Меню:");
            \cli\line("1) Начать новую игру");
            \cli\line("2) Таблица рекордов");
            \cli\line("3) Настройки сложности");
            \cli\line("4) Правила игры");
            \cli\line("5) Выход");
            \cli\line("");
        } else {
            echo "=== Игра 'Холодно-Горячо' ===\n";
            echo "Меню:\n";
            echo "1) Начать новую игру\n";
            echo "2) Таблица рекордов\n";
            echo "3) Настройки сложности\n";
            echo "4) Правила игры\n";
            echo "5) Выход\n\n";
        }
    }
}
