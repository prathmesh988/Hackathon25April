@echo off
start "bun-dev" bun run dev
start "tldrawback" cmd /k "cd tldrawback && ts-node index.ts"
