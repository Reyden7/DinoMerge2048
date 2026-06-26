@echo off
chcp 65001 >nul
cd /d "%~dp0"

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

echo Compilation et synchronisation Android...
call npm run android:open
if errorlevel 1 (
  echo ERREUR : verifie Android Studio et le SDK Android.
  pause
  exit /b 1
)

pause
