# User Guide

## Starting the runtime
```bash
pnpm dev
```

## Sending an agent event
```bash
curl -X POST http://localhost:3000/events -H "Authorization: Bearer <TOKEN>" -d '{ "type": "ping" }'
```

## Keyboard Shortcuts
| Action | Shortcut |
| --- | --- |
| Open command palette | `Ctrl+Shift+P` |
| Toggle logs | `Ctrl+L` |
