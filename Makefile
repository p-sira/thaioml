.PHONY: dev-docs dev-cms dev-backend setup

setup:
	@echo "Setting up frontend dependencies..."
	npm install
	cd docs && uv sync
	@echo "Setting up backend dependencies..."
	cd backend && uv sync
	@echo "Setting up webapp dependencies..."
	cd webapp && npm install

dev-docs:
	@echo "Starting MkDocs..."
	cd docs && uv run mkdocs serve

dev-cms:
	@echo "Starting Decap CMS proxy..."
	npx decap-server

dev-backend:
	@echo "Starting FastAPI backend..."
	cd backend && uv run uvicorn backend.main:app --reload --port 8080

dev-webapp:
	@echo "Starting Next.js Webapp..."
	cd webapp && npm run dev

dev:
	@echo "To run everything manually, we recommend opening this folder in a Devcontainer, or running 'make dev-docs', 'make dev-cms', 'make dev-backend' and 'make dev-webapp' in separate terminals."

dev-all:
	@echo "Starting all services (Docs, CMS, Backend, Webapp)..."
	@trap 'echo "Stopping services..."; kill 0' SIGINT EXIT; $(MAKE) dev-docs & $(MAKE) dev-backend & $(MAKE) dev-cms & $(MAKE) dev-webapp & wait
