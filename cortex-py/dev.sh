#!/bin/bash
# Copyright (c) Open WebUI
# SPDX-License-Identifier: MIT
# Ported to Cortex-OS (c) 2025 Cortex-OS Contributors


uvicorn main:app --port $PORT --host 0.0.0.0 --forwarded-allow-ips '*' --reload