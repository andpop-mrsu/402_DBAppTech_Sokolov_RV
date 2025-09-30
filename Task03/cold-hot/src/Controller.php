<?php
namespace sokol\ColdHot;

//use sokol\ColdHot\View\View;

function startGame() {
    View::renderStartScreen();

    while (true) {
        $choice = View::prompt("Ваш выбор > ");

        switch ($choice) {
            case '1':
                $game = new Game();
                $game->play();
                break;
            case '2':
                View::showMessage("Таблица рекордов пока недоступна (нет базы).");
                break;
            case '3':
                View::showMessage("Настройки сложности пока не реализованы.");
                break;
            case '4':
                View::renderRules();
                break;
            case '5':
                View::showMessage("Выход из игры.");
                return;
            default:
                View::showMessage("Неверный выбор, попробуйте снова.");
        }
    }
}