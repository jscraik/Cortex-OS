SHELL := /bin/sh

# OrbStack dev profiles via Makefile wrappers

.PHONY: dev-min dev-full web api workers obs demo down ps logs

dev-min:
	pnpm dev:orbstack:min

dev-full:
	pnpm dev:orbstack:full

web:
	pnpm dev:orbstack:web

api:
	pnpm dev:orbstack:api

workers:
	pnpm dev:orbstack:workers

obs:
	pnpm dev:orbstack:obs

demo:
	# Full stack demo: core + web + observability
	 docker compose --env-file infra/compose/.env.dev -f infra/compose/docker-compose.dev.yml \
		--profile dev-full --profile web --profile observability up --build -d

down:
	pnpm dev:orbstack:down

ps:
	pnpm dev:orbstack:ps

logs:
	pnpm dev:orbstack:logs

