@echo off
chcp 65001 >nul
rem Xem thu thiep tren may truoc khi dua len mang.
rem Khong mo truc tiep file index.html duoc (trinh duyet chan code khi mo file truc tiep),
rem nen file nay bat mot may chu nho roi mo trinh duyet o http://localhost:8765
rem Meo: them #skip vao cuoi link de vao thang canh 3D, #all de mo khoa luon la thu.
cd /d "%~dp0"
node --no-warnings kiem-tra-config.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
cd /d "%~dp0thiep-trung-thu"
start "Xem thu thiep - dong cua so nay de tat" python -m http.server 8765
timeout /t 2 >nul
start "" "http://localhost:8765/"
