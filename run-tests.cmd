@echo off
set PATH=%USERPROFILE%\.bun\bin;%PATH%
cd /d "%~dp0"
bunx vitest run --coverage %*
