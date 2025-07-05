# Smart Tool of Knowing Development Makefile

.PHONY: help install dev api build clean setup status stop

# Default target
help:
	@echo "🚀 Smart Tool of Knowing Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install    Install all dependencies"
	@echo "  make setup      Configure Linear API (runs 'team setup')"
	@echo ""
	@echo "Development:"
	@echo "  make dev        Start API server (port 3001)"
	@echo "  make api        Start only the API server (port 3001)"
	@echo ""
	@echo "Building:"
	@echo "  make build      Build backend for production"
	@echo ""
	@echo "Utilities:"
	@echo "  make status     Check if API server is running"
	@echo "  make stop       Stop API server"
	@echo "  make clean      Clean build artifacts and node_modules"

# Install all dependencies
install:
	@echo "📦 Installing backend dependencies..."
	npm install
	@echo "✅ All dependencies installed!"

# Setup Linear configuration
setup:
	@echo "⚙️  Setting up Linear API configuration..."
	npm run start -- config setup
	@echo "✅ Linear setup complete!"

# Start API server
dev:
	@echo "🚀 Starting development environment..."
	@echo "   📡 API Server:    http://localhost:3001"
	@echo ""
	@echo "Press Ctrl+C to stop the server"
	npm run api-server

# Start only API server
api:
	@echo "📡 Starting API server on port 3001..."
	@echo "   API Server: http://localhost:3001"
	@echo "   Endpoints:  http://localhost:3001/api/*"
	@echo ""
	npm run api-server

# Build for production
build:
	@echo "🔨 Building backend..."
	npm run build
	@echo "✅ Build complete!"

# Check server status
status:
	@echo "🔍 Checking server status..."
	@if nc -z localhost 3001 2>/dev/null; then \
		echo "   ✅ API Server (3001):    RUNNING"; \
	else \
		echo "   ❌ API Server (3001):    STOPPED"; \
	fi

# Stop API server
stop:
	@echo "🛑 Stopping API server..."
	@pkill -f "api-server" 2>/dev/null || echo "   API server was not running"
	@pkill -f "ts-node.*api-server" 2>/dev/null || true
	@echo "✅ API server stopped"

# Clean everything
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/
	@echo "🧹 Cleaning node_modules..."
	rm -rf node_modules/
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
	@echo ""
	@echo "Configuration:"
	@if npm run --silent dev -- config show | grep -q linearApiKey 2>/dev/null; then \
		echo "   ✅ Linear API configured"; \
	else \
		echo "   ❌ Linear API not configured (run: make setup)"; \
	fi
	@echo ""
	@make status