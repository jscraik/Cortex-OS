import { createService } from "./service";

const port = process.env.PORT || 3000;

const app = createService();

app.listen(port, () => {
	console.log(`Schema registry service listening on port ${port}`);
});
