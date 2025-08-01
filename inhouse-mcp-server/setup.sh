#!/bin/bash

# Bitbucket FastMCP Server Setup Script

echo "Setting up Bitbucket FastMCP Server..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed. Please install pip3."
    exit 1
fi

# Install requirements
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

# Check if .env exists, if not copy from template
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.template .env
    echo "Please edit .env file with your Bitbucket credentials:"
    echo "  BITBUCKET_TOKEN=your_app_password_here"
    echo "  BITBUCKET_EMAIL=your.email@company.com"
else
    echo ".env file already exists."
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Bitbucket credentials"
echo "2. Create a Bitbucket App Password at: https://bitbucket.org/account/settings/app-passwords/"
echo "3. Run the server: python3 bitbucket_server.py"
echo ""
echo "For detailed instructions, see README.md"
