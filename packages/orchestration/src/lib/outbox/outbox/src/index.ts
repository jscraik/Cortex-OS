import { createService } from './service';

const port = process.env.PORT || 3001;

const app = createService();

app.listen(port, () => {
  console.log(`Outbox service listening on port ${port}`);
});
