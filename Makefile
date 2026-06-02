.PHONY: dev stop logs migrate seed test clean

dev:
	docker-compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs -f

migrate:
	cd apps/ingestion-service && alembic upgrade head

seed:
	python scripts/seed.py

test:
	npx turbo run test

clean:
	docker-compose down -v
	rm -rf node_modules apps/web/.next apps/alerting-service/dist
