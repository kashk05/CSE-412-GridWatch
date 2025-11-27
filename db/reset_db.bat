:: For windows
@echo off
echo Resetting GridWatch database...
echo.

:: Set to base path
:: Initialize.sql and nyc311_integrate.sql need path updates as well
cd "C:\Desktop\Coding Projects\CSE-412-GridWatch"

psql -U postgres -f db\Initialize.sql

echo.
echo Database reset complete!
pause