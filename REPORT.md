# CS 314 Final Project Report
**Student:** Gagandeep Bhatia
**Project:** Real-Time Chat Application
**Date:** March 2026
**GitHub:** https://github.com/GagandeepSB/ChatApp

---

## 1. Project Overview

A full-stack real-time chat application supporting direct messages (DMs), group channels, file sharing, and user profile management. The frontend is a pre-built React/Vite bundle served statically; the backend is a Node.js/Express REST + WebSocket API.

---

## 2. Code Structure

```
Project/
├── backend/
│   ├── config/          # DB connection (MongoDB Atlas)
│   ├── constants/        # App-wide constants
│   ├── controllers/      # Route handlers (auth, messages, contacts, channels)
│   ├── middleware/       # Auth guard, error handler, async wrapper
│   ├── models/           # Mongoose models (User, Message, Channel, ChannelMessage)
│   ├── routes/           # Express routers
│   ├── socket/           # Socket.IO server + event handlers
│   ├── utils/            # JWT helpers, ApiError class
│   ├── tests/
│   │   ├── unit/         # Model and utility unit tests
│   │   ├── integration/  # Route integration tests (Supertest)
│   │   └── system/       # System-level security and flow tests
│   └── index.js          # App entry point
└── frontend-project/     # Pre-built Vite/React bundle (served on port 3000)
```

### Key Design Decisions

- **JWT in httpOnly cookie** — prevents XSS token theft; all axios calls use `withCredentials: true`
- **Separate DM and Channel message collections** — `Message` for DMs (sender+recipient), `ChannelMessage` for group channels (`channelId`)
- **Online status in memory** — tracked on the Socket.IO server, not persisted in MongoDB, for performance
- **multer** for file uploads — profiles stored in `uploads/profiles/`, files in `uploads/files/`

---

## 3. Features Implemented

| Feature | Description |
|---|---|
| Signup / Login / Logout | Email + bcrypt password auth, JWT httpOnly cookie |
| Profile setup | First name, last name, avatar color, profile image upload/delete |
| Contact search | Search users by name or email |
| Direct messages | Real-time DMs via Socket.IO, persisted in MongoDB |
| File/image sharing | Upload files in chat, inline preview for images |
| Group channels | Create channels with members, real-time channel messages |
| Channel management | Delete channels (admin only) |
| Delete DM | Remove a DM conversation |
| Offline persistence | Messages to offline users saved and delivered on reconnect |
| Online presence | Green indicator when contact is connected via socket |

---

## 4. Test Coverage Summary

| Suite | Type | Tests |
|---|---|---|
| User model | Unit | 5 |
| Message model | Unit | 4 |
| Channel model | Unit | 4 |
| ChannelMessage model | Unit | 3 |
| JWT utils | Unit | 5 |
| Auth middleware | Unit | 4 |
| Auth routes | Integration | 14 |
| Contacts routes | Integration | 10 |
| Messages routes | Integration | 8 |
| Channels routes | Integration | 10 |
| Socket.IO | Integration | 9 |
| Security (TC19) | System | 9 |
| User flows (TC17) | System | 5 |
| WebSocket (TC18) | System | 3 |
| **Total** | | **93** |

**Coverage (lines): ~85%** across controllers, middleware, models, routes, socket, and utils.

---

## 5. System Tests

System tests are located in `backend/tests/system/` and cover three categories matching the TA's test plan:

### TC17 — User Flows (`flows.test.js`)
- TC17.1: Full signup → login → profile setup flow (4 steps)
- TC17.2: Send DM via Socket.IO → retrieve via REST API
- TC17.3: Delete a DM conversation

### TC18 — WebSocket / Real-Time (`websocket.test.js`)
- TC18.3: Socket connection with tampered JWT is rejected
- TC18.5: `receiveMessage` payload contains all required fields (sender, recipient, content, messageType, timestamp)
- TC18.6: Messages sent to offline users are persisted in MongoDB

### TC19 — Security (`security.test.js`)
- TC19.1: All protected routes return 401 without a JWT cookie
- TC19.2: Expired JWT is rejected with 401
- TC19.3: Tampered JWT is rejected with 401
- TC19.4: NoSQL injection in login (object as password) returns 400 not 500
- TC19.5: NoSQL injection in signup blocked
- TC19.6: Rate limiter is configured and server responds normally under limit
- TC19.7: XSS payload stored as literal string, not executed
- TC19.8: Password hash is never returned in any API response
- TC19.9: Logout clears the JWT cookie

---

## 6. Running the Application

### Start backend
```bash
cd backend
npm start
# Runs on http://localhost:8747
```

### Start frontend
```bash
cd frontend-project
npx serve -s . -l 3000
# Open http://localhost:3000
```

### Run all tests
```bash
cd backend
npm test
# Runs unit + integration + system tests with coverage
```

### Run only system tests
```bash
npm run test:system
```

---

## 7. Challenges and Solutions

| Challenge | Solution |
|---|---|
| Blank screen after signup | Frontend rendered error object as JSX child (React error #31). Fixed by returning flat `{ message, code }` instead of `{ success, error: { message, code } }`. |
| File upload previews broken | Frontend prepends its base URL to `filePath`; returning an absolute URL or a leading-slash path caused double URLs. Fixed by returning `uploads/files/filename` (no leading slash). |
| NoSQL injection crashing bcrypt | Passing an object to `bcrypt.compare` throws. Added `typeof` string checks before any bcrypt call. |
| System tests needed a live server | System tests boot the real Express+Socket.IO server on port 8748 (test env) against mongodb-memory-server. |
| frontend-project treated as submodule | Removed embedded `.git` folder and re-added the directory to the parent repo. |

---

## 8. Additional Features Beyond Requirements

- **Delete DM** (`DELETE /api/contacts/delete-dm/:id`) — removes a conversation from the contacts list
- **Delete channel** (`DELETE /api/channel/delete-channel/:channelId`) — admin-only channel removal
- **Profile image** upload and delete endpoints
- **Audio message support** in the Message/ChannelMessage models (`audioUrl` field)
- **Rate limiting** via `express-rate-limit` on auth routes
- **Centralized error handling** with `ApiError` class and global error middleware
