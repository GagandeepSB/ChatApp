# TDD Build Plan

## TDD Cycle (per feature)
1. Write failing test(s) — verify they fail for the RIGHT reason
2. Write minimum code to make tests pass
3. Refactor — no behavior change, keep tests green

## Phase 0 — Project Scaffolding (no tests yet)
- [ ] Install all production + dev dependencies
- [ ] Create folder structure (config/, utils/, constants/, middleware/, models/, routes/, controllers/, socket/, tests/)
- [ ] config/env.js — validate required env vars, fail fast on startup
- [ ] config/db.js — mongoose connect helper
- [ ] utils/ApiError.js — custom error class
- [ ] utils/asyncHandler.js — async route wrapper
- [ ] utils/token.js — JWT sign/verify
- [ ] constants/socketEvents.js — all event name strings
- [ ] constants/httpStatus.js — named status codes
- [ ] middleware/errorHandler.js — global error handler, formats to response envelope
- [ ] jest.config.js, .env.test, tests/setup.js (mongodb-memory-server)
- [ ] tests/factories/ (userFactory, conversationFactory, messageFactory)
- [ ] index.js skeleton — does not start listening yet (exports app for supertest)

---

## Phase 1 — User Model
### Tests: tests/unit/models/user.model.test.js
- required fields (username, email, passwordHash)
- unique constraint on username
- unique constraint on email
- username minLength/maxLength validation
- email lowercase transform
- contacts defaults to []
- no status field (online presence is in-memory)

### Implement
- models/User.js with schema + indexes

---

## Phase 2 — Auth Utilities
### Tests: tests/unit/utils/token.test.js
- sign() returns a string
- verify(sign(payload)) returns original payload
- verify(expired token) throws
- verify(tampered token) throws
- verify(garbage string) throws

### Implement
- utils/token.js

---

## Phase 3 — Auth Routes (integration)
### Tests: tests/integration/auth.test.js
**Register:**
- POST /api/auth/register → 201, returns { success, data: { token, user } }
- duplicate username → 409, ALREADY_EXISTS
- duplicate email → 409, ALREADY_EXISTS
- missing username → 400, VALIDATION_ERROR
- missing password → 400, VALIDATION_ERROR
- short password → 400, VALIDATION_ERROR
- password stored as hash (not plaintext) in DB

**Login:**
- POST /api/auth/login → 200, returns { success, data: { token, user } }
- wrong password → 401, INVALID_CREDENTIALS
- unknown username → 401, INVALID_CREDENTIALS (never leak which field is wrong)
- missing fields → 400, VALIDATION_ERROR

**Refresh:**
- POST /api/auth/refresh with valid token → 200, new token
- POST /api/auth/refresh with expired/invalid → 401

### Implement
- middleware/rateLimiter.js
- middleware/validate.js
- controllers/authController.js
- routes/auth.js

---

## Phase 4 — Auth Middleware
### Tests: tests/unit/middleware/auth.middleware.test.js
- valid token → sets req.user, calls next()
- missing Authorization header → 401
- malformed header → 401
- expired token → 401
- tampered token → 401

### Implement
- middleware/auth.js

---

## Phase 5 — Conversation Model
### Tests: tests/unit/models/conversation.model.test.js
- required participants array (min 2)
- isGroup defaults to false
- groupName/groupAdmin null for DMs
- lastReadAt is a Map
- index on participants exists
- index on lastMessageAt exists

### Implement
- models/Conversation.js with schema + indexes

---

## Phase 6 — Message Model
### Tests: tests/unit/models/message.model.test.js
- required conversationId + sender
- type enum validates (text/image/file)
- content maxLength 2000
- deletedAt defaults to null
- reactions defaults to []
- compound index on { conversationId, createdAt } exists

### Implement
- models/Message.js with schema + indexes

---

## Phase 7 — Contacts Routes (integration)
### Tests: tests/integration/contacts.test.js
- GET /api/contacts (no auth) → 401
- GET /api/contacts (authed) → 200, empty array initially
- POST /api/contacts { username } → 200, contact added
- POST /api/contacts { username: nonexistent } → 404, USER_NOT_FOUND
- POST /api/contacts self → 400, VALIDATION_ERROR
- POST /api/contacts duplicate → 409, ALREADY_EXISTS
- DELETE /api/contacts/:userId → 200, contact removed
- DELETE /api/contacts/:userId not in contacts → 404

### Implement
- controllers/contactController.js
- routes/contacts.js

---

## Phase 8 — Conversations Routes (integration)
### Tests: tests/integration/conversations.test.js
- GET /api/conversations → 200, empty array initially
- POST /api/conversations { participantId } → 201, creates DM conversation
- POST /api/conversations same pair twice → 200, returns existing (idempotent)
- POST /api/conversations { participantIds[], groupName } → 201, isGroup: true
- POST /api/conversations group missing groupName → 400
- GET /api/conversations → lists conversations sorted by lastMessageAt desc
- GET /api/conversations/:id/messages → 200, empty array initially
- GET /api/conversations/:id/messages?before=<id>&limit=10 → paginated results
- GET /api/conversations for non-member → 403, FORBIDDEN

### Implement
- controllers/conversationController.js + messageController.js
- routes/conversations.js + routes/messages.js

---

## Phase 9 — File Upload (integration)
### Tests: tests/integration/files.test.js
- POST /api/files/upload with valid image → 201, returns { url }
- POST /api/files/upload no file → 400
- POST /api/files/upload wrong MIME type (text/plain) → 400
- POST /api/files/upload file > 5MB → 400
- POST /api/files/upload no auth → 401

### Implement
- middleware/upload.js (multer with MIME whitelist + 5MB limit)
- controllers/fileController.js
- routes/files.js
- Static serving of /uploads in index.js

---

## Phase 10 — Socket.IO (integration)
### Tests: tests/integration/socket.test.js
Uses socket.io-client against real in-memory Express+Socket.IO server

**Connection:**
- connect without token → disconnect event with auth error
- connect with valid token → connected successfully
- connect with expired token → disconnect event with auth error

**Rooms:**
- join-room → client joins socket room for conversationId
- only room members receive new-message events

**Messaging:**
- send-message → { conversationId, content, type: 'text' }
  - message persisted to DB
  - new-message broadcast to all room members (including sender)
  - conversation.lastMessage + lastMessageAt updated
- send-message to conversation user is not member of → error event

**Typing:**
- typing-start → user-typing { conversationId, userId, isTyping: true } broadcast to others (NOT sender)
- typing-stop → user-typing { conversationId, userId, isTyping: false }
- typing events are NOT persisted to DB

**Presence:**
- user connects → user-status { userId, status: 'online' } broadcast to their contacts
- user disconnects → user-status { userId, status: 'offline' } broadcast to their contacts

**Read:**
- mark-read → updates conversation.lastReadAt[userId] in DB

### Implement
- socket/index.js (JWT middleware + room join on connection)
- socket/handlers/messageHandler.js
- socket/handlers/typingHandler.js
- socket/handlers/presenceHandler.js
- socket/handlers/roomHandler.js

---

## Phase 11 — E2E Tests (Playwright)
### Tests: tests/e2e/
Requires both servers running: backend on 8748 (test), frontend-project served on 3000

**auth.e2e.test.js**
- User can register via UI
- User can log in via UI
- Invalid credentials show error

**contacts.e2e.test.js**
- User A can search for and add User B as contact
- User B appears in User A's contact list

**messaging.e2e.test.js**
- User A sends a message to User B
- User B (in separate browser context) sees message appear in real-time
- Typing indicator appears while User A types

**groups.e2e.test.js**
- User A creates group with User B and User C
- All members see messages sent to the group

### Implement
- playwright.config.js
- webServer config: starts backend + serves frontend-project/ automatically

---

## Build Order Summary
```
Phase 0  → Scaffold + test infrastructure
Phase 1  → User model (unit)
Phase 2  → JWT utils (unit)
Phase 3  → Auth routes (integration)
Phase 4  → Auth middleware (unit)
Phase 5  → Conversation model (unit)
Phase 6  → Message model (unit)
Phase 7  → Contacts routes (integration)
Phase 8  → Conversations + Messages routes (integration)
Phase 9  → File upload (integration)
Phase 10 → Socket.IO (integration)
Phase 11 → E2E with Playwright (full stack)
```

## Definition of Done (per phase)
- All tests in that phase pass
- Coverage does not drop below 80%
- No eslint errors
- Code reviewed for security (no injection, no hardcoded secrets)
