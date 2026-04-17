# API Reference — apex-identity (port 8001)

All authenticated endpoints require `Authorization: Bearer <token>` header.

## GET /health

**Response** `200`
```json
{ "status": "ok" }
```

---

## Auth

### POST /auth/register

Register a new user.

**Body**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "s3cr3t",
  "display_name": "Alice"
}
```

**Response** `201`
```json
{
  "id": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "display_name": "Alice"
}
```

**Errors**: `409` username/email already taken.

---

### POST /auth/login

Login and receive a JWT token.

**Body**
```json
{ "username": "alice", "password": "s3cr3t" }
```

**Response** `200`
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "uuid", "username": "alice", "display_name": "Alice" }
}
```

**Errors**: `401` invalid credentials.

---

### GET /auth/me

Get the current user's profile.

**Response** `200`
```json
{
  "id": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "display_name": "Alice",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

## Sessions

### GET /sessions

List all sessions for the current user.

**Response** `200`
```json
[
  { "id": "uuid", "title": "RAG research", "created_at": "...", "updated_at": "..." }
]
```

---

### POST /sessions

Create a new chat session.

**Body**
```json
{ "title": "New conversation" }
```

**Response** `201`
```json
{ "id": "uuid", "title": "New conversation", "messages": [], "created_at": "...", "updated_at": "..." }
```

---

### GET /sessions/{id}

Get a session with its messages.

**Response** `200`
```json
{
  "id": "uuid",
  "title": "RAG research",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What is RAG?",
      "sources": null,
      "files": null,
      "created_at": "..."
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "RAG stands for...",
      "sources": [{ "source": "doc.pdf", "score": 0.92 }],
      "files": null,
      "created_at": "..."
    }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

**Errors**: `404` session not found or not owned by user.

---

### PATCH /sessions/{id}

Update session title.

**Body**
```json
{ "title": "Updated title" }
```

**Response** `200` — updated session object.

---

### DELETE /sessions/{id}

Delete a session and all its messages.

**Response** `204`

---

## Messages

### POST /sessions/{id}/messages

Add a message to a session.

**Body**
```json
{
  "role": "user",
  "content": "What is RAG?",
  "sources": null,
  "files": null
}
```

- `role`: `"user"` or `"assistant"`
- `sources`: optional JSON (array of source objects from apex-rag)
- `files`: optional JSON (file metadata)

**Response** `201` — the created message object.

---

## Users

### GET /users/me

Alias for `GET /auth/me`.

### PATCH /users/me

Update current user's profile.

**Body** (all fields optional)
```json
{
  "display_name": "Alice Smith",
  "email": "newemail@example.com"
}
```

**Response** `200` — updated user object.
