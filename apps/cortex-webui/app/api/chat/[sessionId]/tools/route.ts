import { getToolEvents } from "../../../../../utils/tool-store";

export const runtime = "nodejs";

export async function GET(
	_req: Request,
	{ params }: { params: { sessionId: string } },
) {
	const { sessionId } = params;
	const events = getToolEvents(sessionId);
	return new Response(JSON.stringify({ events }), {
		headers: { "content-type": "application/json" },
	});
}
