# CS 314 Project Specification (Updated)

## Core Features (Required)
1. **User Authentication** — Register/Login, username+password, JWT (7d expiry + /refresh), profile picture
2. **Real-Time Messaging** — Socket.IO only for sending (no dual REST+socket path), REST for history fetch
3. **Contact Management** — Add/remove by username, contact list, online/offline presence (in-memory, not DB)
4. **Group Chats** — Create groups, add/remove members (admin only), leave group, admin role
5. **File/Image Sharing** — Upload + send images in chat (multer, MIME-type validated, size-limited), preview
6. **Message Search** — Search within conversations, filter by user/group
7. **Notifications** — In-app notifications for new messages via socket event

## Bonus Features (Nice-to-Have)
- Message reactions (emoji), Edit/Delete messages (soft delete via deletedAt), Dark/Light mode

---

## Improved Backend Structure

```
backend/
  index.js                    ← Express server entry, mounts middleware + routes, attaches Socket.IO
  config/
    db.js                     ← Mongoose connect logic (exported function)
    env.js                    ← Validates required env vars on startup, process.exit if missing
  constants/
    socketEvents.js           ← Single source of truth for all socket event name strings
    httpStatus.js             ← Named HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)
  utils/
    ApiError.js               ← Custom error class: new ApiError(404, 'USER_NOT_FOUND', 'Not found')
    asyncHandler.js           ← Wraps async route handlers, passes errors to next() automatically
    token.js                  ← sign(payload) and verify(token) JWT helpers
  middleware/
    auth.js                   ← JWT verification, attaches req.user
    errorHandler.js           ← Global error handler: formats all errors to response envelope
    upload.js                 ← multer config: MIME validation, 5MB limit, local /uploads storage
    rateLimiter.js            ← express-rate-limit, applied to /api/auth routes
    validate.js               ← express-validator wrapper: runs checks, throws on failure
  models/
    User.js                   ← See schema below
    Message.js                ← See schema below
    Conversation.js           ← See schema below
  routes/
    auth.js                   ← POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh
    contacts.js               ← GET/POST/DELETE /api/contacts
    conversations.js          ← GET /api/conversations, POST /api/conversations
    messages.js               ← GET /api/conversations/:id/messages?before=<id>&limit=50
    files.js                  ← POST /api/files/upload
  controllers/
    authController.js
    contactController.js
    conversationController.js
    messageController.js
    fileController.js
  socket/
    index.js                  ← Socket.IO server setup, JWT middleware, registers handlers
    handlers/
      messageHandler.js       ← send-message: persist + broadcast
      typingHandler.js        ← typing: broadcast only, never touches DB
      presenceHandler.js      ← connect/disconnect: update in-memory map, broadcast user-status
      roomHandler.js          ← join-room, leave-room
  tests/
    setup.js                  ← mongodb-memory-server connect/disconnect, jest globalSetup
    factories/
      userFactory.js          ← createUser(overrides) helper
      conversationFactory.js
      messageFactory.js
    unit/
      models/
        user.model.test.js
        message.model.test.js
        conversation.model.test.js
      middleware/
        auth.middleware.test.js
      utils/
        token.test.js
        apiError.test.js
    integration/
      auth.test.js
      contacts.test.js
      conversations.test.js
      messages.test.js
      files.test.js
      socket.test.js          ← Uses socket.io-client against real in-memory server
    e2e/
      auth.e2e.test.js        ← Playwright: register → login via pre-built frontend UI
      messaging.e2e.test.js   ← Playwright: send message, see it appear in other user's window
      contacts.e2e.test.js
      groups.e2e.test.js
```

---

## Data Models

### User
```js
{
  username:       { type: String, required, unique, trim, minLength: 3, maxLength: 30 },
  email:          { type: String, required, unique, lowercase, trim },
  passwordHash:   { type: String, required },
  profilePicture: { type: String, default: null },
  contacts:       [{ type: ObjectId, ref: 'User' }],
  createdAt:      { type: Date, default: Date.now }
  // NOTE: online status is NOT stored in DB — tracked in-memory on socket server
}
// Indexes: username (unique), email (unique)
```

### Conversation
```js
{
  participants:   [{ type: ObjectId, ref: 'User', required }],  // 2 for DM, 2+ for group
  isGroup:        { type: Boolean, default: false },
  groupName:      { type: String },           // null for DMs
  groupAdmin:     { type: ObjectId, ref: 'User' },  // null for DMs
  groupPicture:   { type: String },
  lastMessage:    { type: ObjectId, ref: 'Message' },
  lastMessageAt:  { type: Date },
  lastReadAt:     { type: Map, of: Date },    // userId → timestamp (replaces readBy[] on Message)
  createdAt:      { type: Date, default: Date.now }
}
// Indexes: participants (for membership lookups), lastMessageAt (for sorted list)
```

### Message
```js
{
  conversationId: { type: ObjectId, ref: 'Conversation', required },
  sender:         { type: ObjectId, ref: 'User', required },
  content:        { type: String, maxLength: 2000 },
  type:           { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  fileUrl:        { type: String },
  reactions:      [{ userId: ObjectId, emoji: String }],
  deletedAt:      { type: Date, default: null },  // soft delete
  createdAt:      { type: Date, default: Date.now }
}
// Indexes: { conversationId: 1, createdAt: -1 }  ← critical for paginated history
```

---

## API Response Envelope (ALL routes must follow this)

```js
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { message: "Human-readable message", code: "MACHINE_READABLE_CODE" } }
```

Error codes: `USER_NOT_FOUND`, `ALREADY_EXISTS`, `INVALID_CREDENTIALS`, `UNAUTHORIZED`,
`VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`

---

## REST API Routes

```
POST   /api/auth/register          body: { username, email, password }
POST   /api/auth/login             body: { username, password }
POST   /api/auth/refresh           body: { token }

GET    /api/contacts               → user's contact list (populated)
POST   /api/contacts               body: { username }  → add by username
DELETE /api/contacts/:userId

GET    /api/conversations          → all conversations for current user (sorted by lastMessageAt)
POST   /api/conversations          body: { participantId } or { participantIds[], groupName }

GET    /api/conversations/:id/messages   ?before=<messageId>&limit=50  ← cursor pagination
POST   /api/files/upload           multipart/form-data → { url }
```

**IMPORTANT:** Messages are sent via Socket.IO only, NOT via a REST POST route.

---

## Socket.IO Events (constants/socketEvents.js)

```js
// Client → Server
SEND_MESSAGE    = 'send-message'     // { conversationId, content, type, fileUrl? }
TYPING_START    = 'typing-start'     // { conversationId }
TYPING_STOP     = 'typing-stop'      // { conversationId }
JOIN_ROOM       = 'join-room'        // { conversationId }
LEAVE_ROOM      = 'leave-room'       // { conversationId }
MARK_READ       = 'mark-read'        // { conversationId }

// Server → Client
NEW_MESSAGE     = 'new-message'      // full message object
USER_TYPING     = 'user-typing'      // { conversationId, userId, isTyping }
USER_STATUS     = 'user-status'      // { userId, status: 'online'|'offline' }
NOTIFICATION    = 'notification'     // { conversationId, message, sender }
```

Socket.IO JWT auth middleware runs before any event handler — unauthenticated connections are rejected.

---

## Security Checklist
- [x] `helmet` on all routes
- [x] `cors({ origin: 'http://localhost:3000' })` explicit origin
- [x] `express-rate-limit` on /api/auth (15 req / 15 min window)
- [x] `express-validator` input validation on all mutation routes
- [x] bcrypt password hashing (saltRounds: 12)
- [x] JWT secret min 32 chars, validated in config/env.js
- [x] Multer: MIME type whitelist (image/jpeg, image/png, image/gif), 5MB max
- [x] Socket.IO JWT middleware — rejects connections with invalid/missing token
- [x] Soft delete for messages (deletedAt), never hard delete
- [x] Unique indexes on User.username and User.email

---

## Test Infrastructure

### Dependencies
```
# dev
jest, supertest, mongodb-memory-server, socket.io-client
@playwright/test  ← E2E only

# production
helmet, express-rate-limit, express-validator, bcrypt, jsonwebtoken, multer
nodemon (dev)
```

### Package Scripts
```json
{
  "start":          "node index.js",
  "dev":            "nodemon index.js",
  "test":           "jest --runInBand",
  "test:watch":     "jest --watch --runInBand",
  "test:coverage":  "jest --coverage --runInBand",
  "test:e2e":       "playwright test"
}
```

`--runInBand` required: mongodb-memory-server has issues with parallel Jest workers.

### jest.config.js
```js
{
  testEnvironment: 'node',
  globalSetup: './tests/setup.js',
  coverageThreshold: { global: { lines: 80, functions: 80 } },
  testPathIgnorePatterns: ['tests/e2e']   // E2E runs separately via playwright
}
```

### .env.test
```
PORT=8748
DB_URI=  ← left blank; mongodb-memory-server provides the URI dynamically
JWT_SECRET=test-secret-key-minimum-32-characters-long
```

### Test Factory Pattern
```js
// tests/factories/userFactory.js
let counter = 0
const createUser = (overrides = {}) => ({
  username: `user${++counter}`,
  email: `user${counter}@test.com`,
  password: 'Password123!',
  ...overrides
})
```

### E2E Strategy (Playwright)
- Playwright spins up both the backend (port 8748 test instance) and serves the pre-built
  frontend-project/ on port 3000
- Tests drive the actual pre-built UI to verify the full contract is met
- Covers: register, login, add contact, start DM conversation, send message, see message
  appear in receiver's window (two browser contexts)
