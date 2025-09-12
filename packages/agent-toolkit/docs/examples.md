# Examples & Tutorials

## Replace Function Calls
```bash
just codemod 'oldFunc(:[args])' 'newFunc(:[args])' src/
```
## Validate Staged Files
```bash
git diff --name-only > changed.txt
just verify changed.txt
```
