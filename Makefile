.PHONY: dev-docs dev-cms dev-backend setup

setup:
	@echo "Setting up frontend dependencies..."
	npm install
	cd docs && uv venv && uv pip install -r requirements.txt
	@echo "Setting up backend dependencies..."
	cd backend && uv sync

dev-docs:
	@echo "Starting MkDocs..."
	cd docs && .venv/bin/mkdocs serve

dev-cms:
	@echo "Starting Decap CMS proxy..."
	npx decap-server

dev-backend:
	@echo "Starting FastAPI backend..."
	cd backend && .venv/bin/uvicorn main:app --reload --port 8080

dev:
	@echo "To run everything manually, we recommend opening this folder in a Devcontainer, or running 'make dev-docs', 'make dev-cms', and 'make dev-backend' in separate terminals."

dev-all:
	@echo "Starting all services (Docs, CMS, Backend)..."
	@trap 'echo "Stopping services..."; kill 0' SIGINT EXIT; $(MAKE) dev-docs & $(MAKE) dev-backend & $(MAKE) dev-cms & wait
