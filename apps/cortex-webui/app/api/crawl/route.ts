import { Dataset, PlaywrightCrawler } from "crawlee";
import { z } from "zod";

const bodySchema = z.object({
	url: z.string().url(),
});

export async function POST(req: Request) {
	const { url } = bodySchema.parse(await req.json());

	const crawler = new PlaywrightCrawler({
		async requestHandler({ request, page, enqueueLinks }) {
			const title = await page.title();
			await Dataset.pushData({ title, url: request.loadedUrl });
			await enqueueLinks();
		},
	});

	await crawler.run([url]);
	const { items } = await Dataset.getData();
	return Response.json(items);
}
