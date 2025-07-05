#!/bin/bash

# Development startup script for Smart Tool of Knowing

echo "🚀 Starting Smart Tool of Knowing Development Environment"
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

# Start API server
echo "📡 Starting API server on port 3001..."
if check_port 3001; then
    echo "   Port 3001 already in use - API server may already be running"
    echo "   📡 API Server:    http://localhost:3001"
else
    npm run api-server &
    API_PID=$!
    echo "   API server started (PID: $API_PID)"
    echo ""
    echo "✅ API server started!"
    echo ""
    echo "   📡 API Server:    http://localhost:3001"
    echo ""
    echo "Press Ctrl+C to stop the server"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping server..."
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null
    fi
    # Kill any remaining processes
    pkill -f "api-server"
    echo "   Server stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for background processes
wait