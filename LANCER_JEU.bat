@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Verification de Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo ERREUR : Node.js n'est pas installe.
  echo Installe Node.js 22 LTS puis relance ce fichier.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installation des dependances...
  call npm install
  if errorlevel 1 (
    echo ERREUR pendant npm install.
    pause
    exit /b 1
  )
)

echo Lancement du jeu...
call npm run dev
pause
