#!/bin/bash

echo "🎬 OBS Mobile Controller Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo "🚀 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Enable OBS WebSocket:"
echo "   - Open OBS Studio"
echo "   - Go to Tools → WebSocket Server Settings"
echo "   - Enable WebSocket Server"
echo "   - Note the port (default: 4455)"
echo "   - Set a password (optional but recommended)"
echo ""
echo "2. Start the application:"
echo "   npm run dev"
echo ""
echo "3. Access from your mobile device:"
echo "   Frontend: http://$LOCAL_IP:5173"
echo "   Backend:  http://$LOCAL_IP:3001"
echo ""
echo "4. Connect to OBS using:"
echo "   IP: $LOCAL_IP (or localhost if on same computer)"
echo "   Port: 4455 (or your configured port)"
echo "   Password: (if you set one)"
echo ""
echo "Happy streaming! 🎥"
