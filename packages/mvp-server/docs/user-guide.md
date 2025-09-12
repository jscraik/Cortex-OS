# User Guide

## Start the Server
```bash
npx mvp-server start
```
Press `Ctrl+C` to stop.

## Add a Plugin
Create `plugins/hello.js`:
```js
export default async function (app) {
  app.get('/hello', () => 'world');
}
```
Add the plugin in `mvp-server.config.json` and restart.

## View Metrics
Navigate to `http://localhost:3000/metrics` for Prometheus data.
