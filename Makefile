.PHONY: dev-docs dev-cms dev-backend setup

setup:
	@echo "Setting up frontend dependencies..."
	npm install
	cd docs && uv venv && uv pip install -r requirements.txt
	@echo "Setting up backend dependencies..."
	cd backend && uv sync

dev-docs:
	@echo "Starting MkDocs..."
	cd docs && uv run mkdocs serve

dev-cms:
	@echo "Starting Decap CMS proxy..."
	npx decap-server

dev-backend:
	@echo "Starting FastAPI backend..."
	cd backend && uv run uvicorn main:app --reload

dev:
	@echo "To run everything, we recommend opening this folder in a Devcontainer, or running 'make dev-docs', 'make dev-cms', and 'make dev-backend' in separate terminals."
