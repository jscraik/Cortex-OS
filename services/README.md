# Services

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](../README.md#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)](../README.md#testing)

**Backend services powering Cortex-OS**
</div>

---

## Overview
The `services` workspace hosts background services that provide data processing, model inference, and other runtime capabilities. Each service communicates through defined APIs and respects governance boundaries.

### Available Services
- **data-pipeline** – ETL workflows and data ingestion.
- **ml-inference** – Model serving and inference jobs.
- **neurons** – Specialized compute services for agent tasks.

## Development
Services use the standard pnpm-based workflow:

```bash
pnpm install
pnpm build
pnpm test
```

## License
Distributed under the [MIT License](../LICENSE).

