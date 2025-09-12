# Architecture

TDD Coach is composed of modular components that interact through a state machine.

```
+-------------+     +------------------+
| CLI Engine  +-----> Test Frameworks  |
+------+------+     +------------------+
       |                  |
       v                  v
+------------------------------+
|      TDD State Machine       |
+------------------------------+
       |
       v
+------------------------------+
| Coaching & Feedback Modules  |
+------------------------------+
```

- **CLI Engine**: parses commands and flags.
- **Framework Adapters**: run tests for different ecosystems.
- **State Machine**: tracks red, green, and refactor phases.
- **Coaching Modules**: provide contextual guidance.
