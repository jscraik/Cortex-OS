import { getSession } from '../../../../utils/chat-store';

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const session = getSession(sessionId);
  return new Response(JSON.stringify(session), {
    headers: { 'content-type': 'application/json' },
  });
}
