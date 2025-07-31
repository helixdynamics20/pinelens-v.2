@echo off

REM Bitbucket FastMCP Server Setup Script for Windows

echo Setting up Bitbucket FastMCP Server...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: pip is not installed. Please install pip.
    pause
    exit /b 1
)

REM Install requirements
echo Installing Python dependencies...
pip install -r requirements.txt

REM Check if .env exists, if not copy from template
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.template .env
    echo Please edit .env file with your Bitbucket credentials:
    echo   BITBUCKET_TOKEN=your_app_password_here
    echo   BITBUCKET_EMAIL=your.email@company.com
) else (
    echo .env file already exists.
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your Bitbucket credentials
echo 2. Create a Bitbucket App Password at: https://bitbucket.org/account/settings/app-passwords/
echo 3. Run the server: python bitbucket_server.py
echo.
echo For detailed instructions, see README.md

pause
