---
title: Configuration
sidebar_label: Configuration
---

# Configuration

Cortex WebUI uses environment files for both backend and frontend.

## Backend

`backend/.env`

```env
PORT&#61;3001
NODE_ENV&#61;development
JWT_SECRET&#61;change_me
FRONTEND_URL&#61;http://localhost:3000
```

## Frontend

`frontend/.env`

```env
VITE_API_BASE_URL&#61;http://localhost:3001/api
```

Configuration files follow the standard `.env` format and should be kept out of version control.
