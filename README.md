# Real-Time Chat Application

A full-stack real-time chat app with direct messages, group channels, and file sharing.

Built for CS 314 — Gagandeep Bhatia

---

## Tech Stack

- **Backend:** Node.js, Express 5, Socket.IO, MongoDB/Mongoose, JWT (httpOnly cookie), bcrypt, multer
- **Frontend:** Pre-built React + Vite static bundle
- **Database:** MongoDB Atlas
- **Tests:** Jest, Supertest, mongodb-memory-server, Playwright (E2E)

---

## Features

- User signup, login, logout with JWT authentication
- Profile setup — name, avatar color, profile image upload/delete
- Search for contacts by name or email
- Real-time direct messages via Socket.IO
- File and image sharing in chat
- Group channels — create, message, and delete
- Online presence indicator (green dot)
- Messages to offline users are persisted and delivered on reconnect

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas URI (or local MongoDB)

### 1. Clone the repo

```bash
git clone https://github.com/GagandeepSB/ChatApp.git
cd ChatApp
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your DB_URI and JWT_SECRET
```

### 3. Install dependencies

```bash
cd backend
npm install
```

### 4. Run the backend

```bash
npm start
# Runs on http://localhost:8747
```

### 5. Run the frontend

```bash
cd ../frontend-project
npx serve -s . -l 3000
# Open http://localhost:3000
```

---

## Running Tests

```bash
cd backend

# All tests (unit + integration + system) with coverage
npm test

# System tests only
npm run test:system

# E2E tests (Playwright)
npm run test:e2e
```

---

## Project Structure

```
Project/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── constants/       # App-wide constants
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth guard, error handler
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routers
│   ├── socket/          # Socket.IO server
│   ├── utils/           # JWT helpers, ApiError
│   └── tests/
│       ├── unit/        # Model + utility tests
│       ├── integration/ # API route tests
│       └── system/      # Security + flow tests
└── frontend-project/    # Pre-built Vite/React bundle
```

---

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/userinfo` | Get current user |
| POST | `/api/auth/update-profile` | Update name/color |
| POST | `/api/auth/add-profile-image` | Upload avatar |
| POST | `/api/contacts/search` | Search users |
| GET | `/api/contacts/get-contacts-for-list` | Recent contacts |
| POST | `/api/messages/get-messages` | Fetch DM history |
| POST | `/api/messages/upload-file` | Upload file in chat |
| POST | `/api/channel/create-channel` | Create group channel |
| GET | `/api/channel/get-user-channels` | List channels |

## Socket Events

| Event (emit) | Event (receive) | Description |
|---|---|---|
| `sendMessage` | `receiveMessage` | Send/receive a DM |
| `send-channel-message` | `recieve-channel-message` | Channel message |
| `add-channel-notify` | `new-channel-added` | Notify channel members |
