# OBS Mobile Controller

A mobile-friendly web app to control OBS Studio scenes from your phone or tablet on the same network.

## Features

- 🎮 Real-time scene switching
- 📱 Mobile-optimized interface
- 🔄 Auto-reconnection
- ⚡ Fast and responsive
- 🎨 Modern UI with Tailwind CSS

## Setup

### Prerequisites

- Node.js 18+ installed
- OBS Studio with WebSocket plugin enabled
- Both devices on same WiFi network

### Installation

1. Install dependencies:
```bash
npm run install:all
```

2. Enable OBS WebSocket:
   - Open OBS Studio
   - Go to Tools → WebSocket Server Settings
   - Enable WebSocket Server
   - Note the port (default: 4455)
   - Set a password (optional but recommended)

3. Start development servers:
```bash
npm run dev
```

4. Open your mobile browser and navigate to:
   - Frontend: `http://[YOUR_COMPUTER_IP]:5173`
   - Backend: `http://[YOUR_COMPUTER_IP]:3001`

### Production

1. Build frontend:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Usage

1. Open the web app on your mobile device
2. Enter OBS WebSocket details (IP, port, password)
3. Connect to OBS
4. Tap scenes to switch them instantly!

## Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: Vite + TypeScript + Tailwind CSS
- **OBS Integration**: WebSocket API
