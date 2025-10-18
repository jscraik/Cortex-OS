---
name: LegacyEmail
version: 0.9.0
category: comms
description: Legacy email sender kept for backward compatibility.
impl: ./skills/legacy-email.ts
inputs:
  to:
    type: string
    format: email
    required: true
outputs:
  messageId:
    type: string
preconditions:
  - hasSecret:EMAIL_API_KEY
sideEffects:
  - writes:EmailProvider
estimatedCost: "~60ms"
deprecated: true
sunsetDate: 2026-03-31T00:00:00.000Z
supersededBy: SendEmail
---

# LegacyEmail

Deprecated email sender.
