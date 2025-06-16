# Linear Cycle Planning Development Makefile

.PHONY: help install dev api web build clean setup status stop

# Default target
help:
	@echo "🚀 Linear Cycle Planning Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install    Install all dependencies"
	@echo "  make setup      Configure Linear API (runs 'team setup')"
	@echo ""
	@echo "Development:"
	@echo "  make dev        Start both API server and web interface"
	@echo "  make api        Start only the API server (port 3001)"
	@echo "  make web        Start only the web interface (port 3000)"
	@echo ""
	@echo "Building:"
	@echo "  make build      Build both backend and frontend for production"
	@echo ""
	@echo "Utilities:"
	@echo "  make status     Check if servers are running"
	@echo "  make stop       Stop all development servers"
	@echo "  make clean      Clean build artifacts and node_modules"

# Install all dependencies
install:
	@echo "📦 Installing backend dependencies..."
	npm install
	@echo "📦 Installing frontend dependencies..."
	cd web && npm install
	@echo "✅ All dependencies installed!"

# Setup Linear configuration
setup:
	@echo "⚙️  Setting up Linear API configuration..."
	npm run dev -- setup
	@echo "✅ Linear setup complete!"

# Start both servers
dev:
	@echo "🚀 Starting development environment..."
	@echo "   📡 API Server:    http://localhost:3001"
	@echo "   🌐 Web Interface: http://localhost:3000"
	@echo ""
	@echo "Press Ctrl+C to stop all servers"
	@./start-dev.sh

# Start only API server
api:
	@echo "📡 Starting API server on port 3001..."
	@echo "   API Server: http://localhost:3001"
	@echo "   Endpoints:  http://localhost:3001/api/*"
	@echo ""
	npm run api-server

# Start only web interface
web:
	@echo "🌐 Starting web interface on port 3000..."
	@echo "   Web Interface: http://localhost:3000"
	@echo ""
	npm run web

# Build for production
build:
	@echo "🔨 Building backend..."
	npm run build
	@echo "🔨 Building frontend..."
	npm run web:build
	@echo "✅ Build complete!"

# Check server status
status:
	@echo "🔍 Checking server status..."
	@if nc -z localhost 3001 2>/dev/null; then \
		echo "   ✅ API Server (3001):    RUNNING"; \
	else \
		echo "   ❌ API Server (3001):    STOPPED"; \
	fi
	@if nc -z localhost 3000 2>/dev/null; then \
		echo "   ✅ Web Interface (3000): RUNNING"; \
	else \
		echo "   ❌ Web Interface (3000): STOPPED"; \
	fi

# Stop all servers
stop:
	@echo "🛑 Stopping all development servers..."
	@pkill -f "api-server" 2>/dev/null || echo "   API server was not running"
	@pkill -f "vite.*web" 2>/dev/null || echo "   Web server was not running"
	@pkill -f "ts-node.*api-server" 2>/dev/null || true
	@echo "✅ All servers stopped"

# Clean everything
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/
	rm -rf web/dist/
	@echo "🧹 Cleaning node_modules..."
	rm -rf node_modules/
	rm -rf web/node_modules/
	@echo "✅ Cleanup complete!"

# Quick development setup for new developers
quick-start: install setup dev

# Development check - ensure everything is ready
check:
	@echo "🔍 Development Environment Check"
	@echo ""
	@echo "Dependencies:"
	@if [ -d "node_modules" ]; then \
		echo "   ✅ Backend dependencies installed"; \
	else \
		echo "   ❌ Backend dependencies missing (run: make install)"; \
	fi
	@if [ -d "web/node_modules" ]; then \
		echo "   ✅ Frontend dependencies installed"; \
	else \
		echo "   ❌ Frontend dependencies missing (run: make install)"; \
	fi
	@echo ""
	@echo "Configuration:"
	@if npm run --silent dev -- config show | grep -q linearApiKey 2>/dev/null; then \
		echo "   ✅ Linear API configured"; \
	else \
		echo "   ❌ Linear API not configured (run: make setup)"; \
	fi
	@echo ""
	@make status