# User Guide

- Access the Swagger UI at `http://localhost:3000/documentation` for interactive API exploration.
- Query server listings:
  ```bash
  curl http://localhost:3000/api/v1/servers
  ```
- Filter by category via query parameters:
  ```bash
  curl http://localhost:3000/api/v1/servers?category=ai
  ```
