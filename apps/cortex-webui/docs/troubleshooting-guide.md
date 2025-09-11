# Troubleshooting Guide

### Backend fails to start
Ensure `PORT` is free and environment variables are set. Check logs in `backend/logs/` for details.

### Frontend cannot reach API
Verify `VITE_API_BASE_URL` points to the backend and CORS is configured correctly.

### WebSocket disconnects
Confirm the token passed in the WebSocket query string is valid and has not expired.
