# Page snapshot

```yaml
- application "Cortex-OS Dashboard" [ref=e2]:
  - alert [ref=e3]:
    - heading "Cortex-OS Dashboard" [level=1] [ref=e4]
    - heading "Unable to load system status" [level=2] [ref=e5]
    - paragraph [ref=e6]: OpenAI Apps SDK runtime client is not available. Provide window.openai.apps in ChatGPT Apps.
    - button "Retry" [ref=e7] [cursor=pointer]
    - generic [ref=e8]: Refresh system status
```