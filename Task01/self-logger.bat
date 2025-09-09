@echo off
chcp 1251 >nul

set DB_NAME=logger.db
set TABLE_NAME=execution_log
set USERNAME=%USERNAME%
set CURRENT_DATETIME=%date% %time%


if not exist "%DB_NAME%" (
    echo Creating new database and table...
    sqlite3 "%DB_NAME%" "CREATE TABLE %TABLE_NAME% (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, execution_date TEXT);"
)


sqlite3 "%DB_NAME%" "INSERT INTO %TABLE_NAME% (username, execution_date) VALUES ('%USERNAME%', '%CURRENT_DATETIME%');"


for /f "tokens=*" %%a in ('sqlite3 "%DB_NAME%" "SELECT COUNT(*) FROM %TABLE_NAME%;"') do set /a COUNT=%%a


for /f "tokens=*" %%b in ('sqlite3 "%DB_NAME%" "SELECT execution_date FROM %TABLE_NAME% ORDER BY id ASC LIMIT 1;"') do set FIRST_RUN=%%b

echo.

echo Имя программы: %~nx0
echo Количество запусков: %COUNT%
echo Первый запуск: %FIRST_RUN%
echo ---------------------------------------------
echo User      ^| Date
echo ---------------------------------------------


sqlite3 "%DB_NAME%" "SELECT username, execution_date FROM %TABLE_NAME% ORDER BY id DESC;"

echo ---------------------------------------------
echo.
pause