# API Documentation

This document provides detailed information about the Cortex WebUI API endpoints.

## Authentication

### Register a New User

**POST** `/api/auth/register`

Registers a new user account.

**Request Body**

```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response**

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "createdAt": "string",
    "updatedAt": "string"
  },
  "token": "string"
}
```

### Login

**POST** `/api/auth/login`

Authenticates a user and returns a JWT token.

**Request Body**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response**

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "createdAt": "string",
    "updatedAt": "string"
  },
  "token": "string"
}
```

### Logout

**POST** `/api/auth/logout`

Logs out the current user.

**Response**

```json
{
  "message": "Logged out successfully"
}
```

## Conversations

### Get All Conversations

**GET** `/api/conversations`

Retrieves all conversations for the authenticated user.

**Response**

```json
[
  {
    "id": "string",
    "title": "string",
    "userId": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### Create a Conversation

**POST** `/api/conversations`

Creates a new conversation.

**Request Body**

```json
{
  "title": "string"
}
```

**Response**

```json
{
  "id": "string",
  "title": "string",
  "userId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Get a Conversation

**GET** `/api/conversations/{id}`

Retrieves a specific conversation by ID.

**Response**

```json
{
  "id": "string",
  "title": "string",
  "userId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Update a Conversation

**PUT** `/api/conversations/{id}`

Updates a specific conversation.

**Request Body**

```json
{
  "title": "string"
}
```

**Response**

```json
{
  "id": "string",
  "title": "string",
  "userId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Delete a Conversation

**DELETE** `/api/conversations/{id}`

Deletes a specific conversation.

**Response**

```json
{
  "message": "Conversation deleted successfully"
}
```

## Messages

### Get Messages for a Conversation

**GET** `/api/conversations/{conversationId}/messages`

Retrieves all messages for a specific conversation.

**Response**

```json
[
  {
    "id": "string",
    "conversationId": "string",
    "role": "user|assistant|system",
    "content": "string",
    "createdAt": "string"
  }
]
```

### Create a Message

**POST** `/api/conversations/{conversationId}/messages`

Creates a new message in a conversation.

**Request Body**

```json
{
  "content": "string",
  "role": "user|assistant|system"
}
```

**Response**

```json
{
  "id": "string",
  "conversationId": "string",
  "role": "user|assistant|system",
  "content": "string",
  "createdAt": "string"
}
```

## Models

### Get All Models

**GET** `/api/models`

Retrieves all available AI models.

**Response**

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "provider": "string",
    "capabilities": ["string"],
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### Get a Model

**GET** `/api/models/{id}`

Retrieves a specific AI model by ID.

**Response**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "provider": "string",
  "capabilities": ["string"],
  "createdAt": "string",
  "updatedAt": "string"
}
```

## Files

### Upload a File

**POST** `/api/files/upload`

Uploads a file.

**Request Body**
Multipart form data with a `file` field.

**Response**

```json
{
  "id": "string",
  "name": "string",
  "size": "number",
  "type": "string",
  "url": "string",
  "uploadedAt": "string"
}
```

### Delete a File

**DELETE** `/api/files/{id}`

Deletes a specific file.

**Response**

```json
{
  "message": "File deleted successfully"
}
```

## WebSocket API

The WebSocket API provides real-time communication capabilities.

**Endpoint**: `ws://localhost:3001/ws`

**Authentication**: Pass JWT token as query parameter `?token=YOUR_JWT_TOKEN`

### Events

#### Client to Server

1. **message**: Send a message
   ```json
   {
     "type": "message",
     "payload": {
       "content": "string",
       "conversationId": "string"
     }
   }
   ```

#### Server to Client

1. **welcome**: Connection established

   ```json
   {
     "type": "welcome",
     "payload": "string"
   }
   ```

2. **message**: Receive a message

   ```json
   {
     "type": "message",
     "payload": {
       "id": "string",
       "content": "string",
       "role": "user|assistant|system",
       "createdAt": "string"
     }
   }
   ```

3. **typing**: User is typing
   ```json
   {
     "type": "typing",
     "payload": {
       "userId": "string",
       "conversationId": "string"
     }
   }
   ```

## Error Responses

All error responses follow this format:

```json
{
  "error": "string",
  "details": "object" // Optional, present only in development
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error)
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict (e.g., user already exists)
- **500**: Internal Server Error
