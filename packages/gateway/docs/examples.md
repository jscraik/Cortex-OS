# Examples & Tutorials

## Node.js Fetch Example
```javascript
const res = await fetch('http://localhost:3333/rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'Hello' })
});
const data = await res.json();
console.log(data);
```

Additional examples can be found in the repository's `examples/` directory.
