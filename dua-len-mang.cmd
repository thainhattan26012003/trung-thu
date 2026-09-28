@echo off
chcp 65001 >nul
rem Dua ban moi nhat trong thu muc thiep-trung-thu len https://tata-trung-thu-vui-ve.netlify.app
cd /d "%~dp0"
set "NETLIFY_AUTH_TOKEN="
set "SITE=f3f8fc4c-e21e-46e5-acba-6fe6572efee2"

rem Kiem tra config.js truoc: neu go sai thi dung lai, khong dua ban hong len mang
node --no-warnings kiem-tra-config.mjs
if errorlevel 1 (
  echo Chua dua len mang. Sua loi o tren roi chay lai file nay.
  pause
  exit /b 1
)

echo Dang dua thiep len mang...
call npx -y netlify-cli@latest deploy --prod --no-build --dir thiep-trung-thu --site %SITE% --message "Cap nhat noi dung"
if not errorlevel 1 goto ok

rem Loi thuong gap: may nay chua dang nhap Netlify -> dang nhap roi thu lai mot lan
echo.
echo ------------------------------------------------------------
echo Can dang nhap Netlify tren may nay (chi can lam mot lan).
echo Bam phim bat ky: trinh duyet se mo trang Netlify.
echo Dang nhap DUNG tai khoan da tao trang thiep, bam Authorize, roi quay lai cua so nay.
echo ------------------------------------------------------------
pause
call npx -y netlify-cli@latest login --new
echo.
echo Dang thu dua len lai...
call npx -y netlify-cli@latest deploy --prod --no-build --dir thiep-trung-thu --site %SITE% --message "Cap nhat noi dung"
if not errorlevel 1 goto ok

echo.
echo Van chua dua len duoc. Chup man hinh cua so nay gui cho Claude nhe.
pause
exit /b 1

:ok
echo.
echo Xong! Mo lai link de xem: https://tata-trung-thu-vui-ve.netlify.app
pause
