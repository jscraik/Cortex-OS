# Configuration

Cortex WebUI uses environment files for both backend and frontend.

## Backend

`backend/.env`

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=change_me
FRONTEND_URL=http://localhost:3000
```

## Frontend

`frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Configuration files follow the standard `.env` format and should be kept out of version control.
