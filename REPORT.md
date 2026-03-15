# CS 314 — Instant Messaging App: Final Project Report

**Student:** Gagandeep Bhatia
**Course:** CS 314 — Elements of Software Engineering (Winter 2026)
**Instructor:** Prof. Fei Xie
**GitHub Repository:** https://github.com/YOUR_USERNAME/YOUR_REPO _(replace with your link)_

---

## 1. Project Overview

This project implements the **backend** of a real-time instant messaging application, integrated with a pre-built React + Vite frontend provided by the TA. The backend is built on the MERN stack and supports user authentication, direct messaging, group channels, file uploads, and real-time communication via Socket.IO.

---

## 2. Code Structure

```
backend/
├── config/
│   ├── db.js               # MongoDB Atlas connection
│   └── env.js              # Environment variable validation on startup
├── constants/
│   ├── httpStatus.js        # HTTP status code constants
│   └── socketEvents.js      # Socket.IO event name constants
├── controllers/
│   ├── authController.js    # Signup, login, logout, profile management
│   ├── channelController.js # Create/delete channels, fetch channel messages
│   ├── contactController.js # Search users, contact list, delete DM
│   └── messageController.js # Fetch DM history, file upload
├── middleware/
│   ├── auth.js              # JWT cookie verification (httpOnly cookie)
│   ├── errorHandler.js      # Global Express error handler
│   ├── rateLimiter.js       # express-rate-limit (15 req / 15 min)
│   ├── upload.js            # multer file upload (profiles + files)
│   └── validate.js          # express-validator wrapper
├── models/
│   ├── User.js              # email, password, firstName, lastName, image, color, profileSetup
│   ├── Message.js           # DM messages (sender, recipient, content, fileUrl, timestamp)
│   ├── Channel.js           # name, members[], admin
│   └── ChannelMessage.js    # channelId, sender, content, fileUrl, timestamp
├── routes/
│   ├── auth.js              # /api/auth/*
│   ├── contacts.js          # /api/contacts/*
│   ├── messages.js          # /api/messages/*
│   └── channel.js           # /api/channel/*
├── socket/
│   ├── index.js             # Socket.IO setup, cookie-based JWT auth, presence map
│   └── handlers/
│       ├── dmHandler.js     # sendMessage → persist → receiveMessage
│       └── channelHandler.js# send-channel-message → persist → recieve-channel-message
├── utils/
│   ├── ApiError.js          # Custom error class with statusCode + code
│   ├── asyncHandler.js      # Wraps async controllers, eliminates try/catch
│   └── token.js             # JWT sign and verify helpers
├── tests/
│   ├── unit/                # Model schema and utility unit tests
│   ├── integration/         # Full API endpoint integration tests
│   ├── system/              # End-to-end flows, WebSocket, and security tests
│   └── e2e/                 # Playwright browser automation tests
└── index.js                 # Express app entry point, exports { app, server }

frontend-project/            # Pre-built React + Vite bundle (provided by TA, not modified)
Planning Docs/               # Architecture doc, project spec, build plan
docs/                        # Original project documents (PDFs)
```

---

## 3. Testing

Testing follows a **Test-Driven Development (TDD)** approach: tests were written before implementation and used to drive each phase of development.

### Test Stack
- **Unit / Integration / System:** Jest + Supertest + mongodb-memory-server + socket.io-client
- **E2E:** Playwright (Chromium browser automation against live app)

### Test Counts

| Category | Suites | Tests |
|----------|--------|-------|
| Unit | 5 | 24 |
| Integration | 7 | 52 |
| System | 3 | 22 |
| E2E (Playwright) | 4 | 14 |
| **Total** | **19** | **112** |

### Coverage (Jest — unit + integration + system)

| Metric | Result | Threshold |
|--------|--------|-----------|
| Lines | 82.31% | 80% ✅ |
| Statements | 80.22% | 80% ✅ |
| Functions | 61.81% | 60% ✅ |

### How to Run Tests

```bash
cd backend

# All tests (unit + integration + system) with coverage
npm test

# System tests only
npm run test:system

# E2E browser tests (requires both servers running)
npm run test:e2e
```

### System Tests (TC17–TC19)

The `tests/system/` directory covers the system and security test cases from the Test Plan:

- **`flows.test.js`** — TC17.1 (signup→login→profile), TC17.2 (socket send→REST retrieve), TC17.3 (delete DM)
- **`websocket.test.js`** — TC18.3 (tampered JWT rejected), TC18.5 (payload fields), TC18.6 (offline persistence)
- **`security.test.js`** — TC19.1–TC19.9 (unauthenticated routes, expired/tampered JWT, NoSQL injection, XSS, rate limiting)

---

## 4. Challenges Faced

### 4.1 API Contract Mismatch
The biggest challenge was discovering that the pre-built frontend bundle expected a completely different API from what was initially designed. The frontend used `/api/channel` (not `/api/conversations`), cookie-based JWT auth (not Bearer tokens), a different user model (`firstName`/`lastName` instead of `username`), and different Socket.IO event names. This was discovered by **inspecting the minified frontend JavaScript bundle** with Node.js scripts to extract all API URLs, axios configuration, and socket event names. The entire backend was then rewritten to match the actual frontend contract.

### 4.2 Cookie-Based JWT Authentication
The frontend used `withCredentials: true` on all axios requests and expected an `httpOnly` cookie named `jwt` — not an Authorization header. This required adding `cookie-parser` middleware and updating the Socket.IO server to extract the JWT from the `handshake.headers.cookie` string rather than a query parameter or header.

### 4.3 Socket.IO Typo in Frontend
The frontend bundle contained a deliberate typo: the channel message receive event is named `recieve-channel-message` (misspelled) rather than `receive-channel-message`. This had to be matched exactly in the backend's socket constants, otherwise channel messages would never reach clients.

### 4.4 Cross-Origin File Serving
Files uploaded to the backend (port 8747) were displayed in the frontend (port 3000). Two issues arose: the `Cross-Origin-Resource-Policy` header had to be set to `cross-origin` via Helmet, and the file path format returned by the upload endpoint had to be a relative path (e.g., `uploads/files/photo.png`) because the frontend prepends the API base URL (`http://localhost:8747/`) itself — returning a full URL caused a double-slash 404.

### 4.5 NoSQL Injection Vulnerability
During system security testing, it was discovered that passing a JavaScript object as `password` to the login endpoint caused bcrypt to throw `Error: data and hash must be strings`, which propagated as a 500 error. This was fixed by adding explicit `typeof` string checks before bcrypt is invoked, ensuring all injection attempts receive a clean 400 response.

---

## 5. Additional Features (Beyond Base Requirements)

| Feature | Details |
|---------|---------|
| **File & image sharing** | Users can send image and file attachments in DMs and channels via `POST /api/messages/upload-file` |
| **Profile photo upload** | Users can upload and remove a profile photo via `POST/DELETE /api/auth/add-profile-image` |
| **Group channels** | Full channel support: create, join, send messages, delete — beyond basic 1-on-1 DM |
| **Rate limiting** | `express-rate-limit` on all routes (15 req/15 min in production) to prevent brute-force attacks |
| **Security hardening** | Helmet.js (CSP, CORP, XSS headers), bcrypt password hashing (10 rounds), httpOnly JWT cookies |
| **Input validation** | Type checks on all auth inputs to prevent NoSQL injection and unexpected crashes |
| **Test coverage reporting** | Istanbul/Jest coverage with HTML report (`coverage/lcov-report/index.html`) |
| **Playwright E2E tests** | 14 automated browser tests covering full user journeys end-to-end |
| **TDD throughout** | All 98 tests were written before implementation and used to drive development phase by phase |

---

## 6. Running the Application

```bash
# Terminal 1 — Backend (port 8747)
cd backend
node index.js

# Terminal 2 — Frontend (port 3000)
cd frontend-project
npm start
```

Open **http://localhost:3000** in your browser.
