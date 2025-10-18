---
name: SendEmail
version: 1.2.0
category: comms
description: Sends a transactional email via the configured provider.
impl: ./skills/send-email.ts
inputs:
  to:
    type: string
    format: email
    required: true
  subject:
    type: string
    minLength: 1
    required: true
  bodyHtml:
    type: string
    required: true
outputs:
  messageId:
    type: string
preconditions:
  - hasSecret:EMAIL_API_KEY
sideEffects:
  - writes:EmailProvider
estimatedCost: "~40ms"
requiresContext:
  - tenantId
providesContext:
  - lastEmailMessageId
monitoring: true
deprecated: false
---

# SendEmail

Sends transactional email using the configured provider.
