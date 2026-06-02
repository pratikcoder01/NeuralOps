.PHONY: dev stop logs migrate seed test e2e-test port-forward tunnel ml-train clean

dev:
	docker-compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs -f

migrate:
	cd apps/ingestion-service && alembic upgrade head

seed:
	python scripts/seed.py --env=local

test:
	npx turbo run test

e2e-test:
	pytest tests/e2e/ -v

port-forward:
	kubectl port-forward svc/ingestion-service 8000:8000 &
	kubectl port-forward svc/alerting-service 4000:4000 &

tunnel:
	ngrok http 8000

ml-train:
	cd ml && python anomaly_detection/training/train.py --experiment-name=dev --epochs=10 --data-path=data/synthetic/

clean:
	docker-compose down -v
	rm -rf node_modules apps/web/.next apps/alerting-service/dist
