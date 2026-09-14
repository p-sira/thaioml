.PHONY: dev-backend dev-webapp dev-all setup test test-backend test-webapp test-e2e

-include .env
export

setup:
	@echo "Setting up frontend dependencies..."
	npm install
	@echo "Setting up backend dependencies..."
	cd backend && uv sync
	@echo "Setting up webapp dependencies..."
	cd webapp && npm install

dev-backend:
	@echo "Starting FastAPI backend..."
	cd backend && uv run uvicorn backend.main:app --reload --port 8080

dev-webapp:
	@echo "Starting Next.js Webapp..."
	cd webapp && npm run dev

dev:
	@echo "To run everything manually, we recommend opening this folder in a Devcontainer, or running 'make dev-backend' and 'make dev-webapp' in separate terminals."

dev-all:
	@echo "Starting all services (Backend, Webapp)..."
	@trap 'echo "Stopping services..."; kill 0' SIGINT EXIT; $(MAKE) dev-backend & $(MAKE) dev-webapp & wait

test-backend:
	@echo "Running backend unit tests..."
	cd backend && uv run pytest

test-webapp:
	@echo "Running webapp unit tests..."
	cd webapp && npm run test

test-e2e:
	@echo "Running Playwright E2E smoke tests..."
	npx playwright test

test: test-backend test-webapp
	@echo "Unit testing complete. For E2E tests, make sure servers are running and run 'make test-e2e'"
