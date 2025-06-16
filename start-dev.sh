#!/bin/bash

# Development startup script for Linear Planning UI

echo "🚀 Starting Linear Planning Development Environment"
echo ""

# Check if Linear is configured
if ! npm run --silent dev -- --help 2>/dev/null | grep -q "team"; then
    echo "⚠️  Make sure you've run 'team setup' to configure Linear API access"
    echo ""
fi

# Function to check if port is in use
check_port() {
    nc -z localhost $1 2>/dev/null
}

# Start API server in background
echo "📡 Starting API server on port 3001..."
if check_port 3001; then
    echo "   Port 3001 already in use - API server may already be running"
else
    npm run api-server &
    API_PID=$!
    echo "   API server started (PID: $API_PID)"
fi

# Wait a moment for API server to start
sleep 2

# Start web development server
echo "🌐 Starting web interface on port 3000..."
if check_port 3000; then
    echo "   Port 3000 already in use - web server may already be running"
else
    npm run web &
    WEB_PID=$!
    echo "   Web interface started (PID: $WEB_PID)"
fi

echo ""
echo "✅ Development servers started!"
echo ""
echo "   🌐 Web Interface: http://localhost:3000"
echo "   📡 API Server:    http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null
    fi
    if [ ! -z "$WEB_PID" ]; then
        kill $WEB_PID 2>/dev/null
    fi
    # Kill any remaining processes
    pkill -f "api-server"
    pkill -f "vite.*web"
    echo "   Servers stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for background processes
wait