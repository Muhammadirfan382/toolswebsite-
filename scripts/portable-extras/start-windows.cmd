@echo off
REM Opens this copy of the site in your browser.
REM A tiny local web server is needed: browsers refuse to run a page's scripts when it is opened
REM straight from a folder (file://), so the tools would look fine but do nothing.
cd /d "%~dp0"

REM Running this straight from inside the .zip window extracts only this one file to a temp
REM folder, so there would be no site to serve. Catch that before starting a server.
if not exist "index.html" (
  echo.
  echo This folder has no index.html next to the script, so there is nothing to serve.
  echo.
  echo You are probably running it from inside the ZIP window. Close it, then:
  echo   1. right-click the .zip file  ^>  Extract All...
  echo   2. open the extracted folder
  echo   3. double-click start-windows.cmd there
  echo.
  REM Quoted: a folder path containing "&" would otherwise be read as another command.
  echo Current folder: "%CD%"
  echo.
  pause
  goto :eof
)

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
