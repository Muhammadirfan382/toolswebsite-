@echo off
REM Opens this copy of the site in your browser.
REM A tiny local web server is needed: browsers refuse to run a page's scripts when it is opened
REM straight from a folder (file://), so the tools would look fine but do nothing.
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000/index.html
  echo Serving this folder at http://localhost:8000  -  close this window to stop.
  python -m http.server 8000
  goto :eof
)

where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000/index.html
  echo Serving this folder at http://localhost:8000  -  close this window to stop.
  npx --yes serve -l 8000 .
  goto :eof
)

echo Neither Python nor Node was found on this computer.
echo.
echo Easiest alternative: open the online test copy instead:
echo   https://muhammadirfan382.github.io/toolswebsite-/
echo.
pause
