# CS 314 Project Memory

## Project Overview
Real-Time Chat Application (Gagandeep Bhatia, CS 314)
Full spec: `project-spec.md` | TDD build order: `build-plan.md`

## Current State (as of March 2026)
- `backend/` — FULLY COMPLETE. 76 unit+integration tests (12 suites) + 14 E2E Playwright tests — ALL PASSING
- `frontend-project/` — pre-built Vite/React static bundle (no source), served on port 3000
- All phases 0–11 complete including Playwright E2E
- Auth is cookie-based (httpOnly jwt cookie), NOT Bearer token
- Models: User, Message, Channel, ChannelMessage (Conversation.js deleted)

## Tech Stack
- Backend: Node.js/Express 5 (CommonJS), Socket.IO, MongoDB/Mongoose, JWT, bcrypt, multer
- Frontend: Pre-built React+Vite bundle (no source — do not modify)
- DB: MongoDB Atlas (URI already in .env)
- Tests: Jest + Supertest + mongodb-memory-server + socket.io-client + Playwright (E2E)

## Key Architectural Decisions
- Messages sent via Socket.IO ONLY (not REST POST) — REST is read-only for history
- Online/offline status is in-memory on socket server (NOT stored in MongoDB)
- Read receipts on Conversation.lastReadAt Map (NOT readBy[] array on every Message)
- Soft delete for messages (deletedAt field)
- Cursor-based pagination on message history (?before=<id>&limit=50)
- All routes return `{ success, data }` or `{ success, error: { message, code } }`
- JWT expiry 7d + /api/auth/refresh endpoint
- Socket.IO JWT auth middleware rejects unauthenticated connections

## Critical Files to Create
See `project-spec.md` for full folder structure.
Key utility files needed before any feature work:
- config/env.js (validate env vars, fail fast)
- utils/ApiError.js, utils/asyncHandler.js, utils/token.js
- constants/socketEvents.js (single source of truth for event names)
- middleware/errorHandler.js (global, enforces response envelope)
- tests/setup.js (mongodb-memory-server global setup)
- tests/factories/ (user, conversation, message factory helpers)

## Test Strategy
- Unit: model schemas, JWT utils, auth middleware
- Integration: all REST routes + Socket.IO (Supertest + socket.io-client against in-memory DB)
- E2E: Playwright drives pre-built frontend on :3000 against test backend on :8748
- Run with --runInBand (mongodb-memory-server + parallel workers = problems)

## Environment
- backend/.env: PORT=8747, DB_URI=mongodb+srv://...
- Tests use .env.test: PORT=8748, DB_URI left blank (mongodb-memory-server provides it)
- backend/package.json: main=index.js, type=commonjs
