import type { Request, Response } from 'express';

export async function postCrawl(req: Request, res: Response) {
	try {
		if (
			process.env.ENABLE_CRAWLER !== '1' &&
			process.env.ENABLE_CRAWLER !== 'true'
		) {
			res
				.status(501)
				.json({ error: 'Crawler disabled. Set ENABLE_CRAWLER=1 to enable.' });
			return;
		}

		// Lazy import to avoid heavy deps during normal server start
		const { Dataset, PlaywrightCrawler } = await import('crawlee');
		const z = (await import('zod')).z;

		const bodySchema = z.object({ url: z.string().url() });
		const { url } = bodySchema.parse(req.body);

		const crawler = new PlaywrightCrawler({
			async requestHandler({ request, page, enqueueLinks }) {
				const title = await page.title();
				await Dataset.pushData({ title, url: request.loadedUrl });
				await enqueueLinks();
			},
		});

		await crawler.run([url]);
		const { items } = await Dataset.getData();
		res.json(items);
	} catch (e) {
		res.status(400).json({ error: (e as Error).message });
	}
}
