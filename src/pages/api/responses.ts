import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getRuntimeEnv, jsonError, requireAccessUser, ResponseError } from '../../lib/access';

export const prerender = false;

const MAX_RESPONSE_LENGTH = 4000;

interface ResponsePayload {
  moduleId?: unknown;
  promptId?: unknown;
  responseText?: unknown;
}

export async function POST({ request, locals }: APIContext): Promise<Response> {
  try {
    const env = getRuntimeEnv(locals);
    if (!env.DB) throw new ResponseError(500, 'Response database is not configured.');

    const user = await requireAccessUser(request, env);
    const payload = (await request.json().catch(() => null)) as ResponsePayload | null;

    if (!payload || typeof payload !== 'object') {
      throw new ResponseError(400, 'Request body must be JSON.');
    }

    const moduleId = typeof payload.moduleId === 'string' ? payload.moduleId : '';
    const promptId = typeof payload.promptId === 'string' ? payload.promptId : '';
    const responseText = typeof payload.responseText === 'string' ? payload.responseText.trim() : '';

    if (!moduleId || !promptId) {
      throw new ResponseError(400, 'Module and prompt are required.');
    }

    if (responseText.length > MAX_RESPONSE_LENGTH) {
      throw new ResponseError(400, `Responses must be ${MAX_RESPONSE_LENGTH} characters or fewer.`);
    }

    const modules = await getCollection('modules', ({ data }) => !data.draft);
    const module = modules.find((entry) => entry.id === moduleId);
    if (!module) throw new ResponseError(404, 'Module not found.');

    const prompt = module.data.responsePrompts.find((item) => item.id === promptId);
    if (!prompt) throw new ResponseError(404, 'Prompt not found.');

    if (prompt.required && responseText.length === 0) {
      throw new ResponseError(400, 'Response text is required.');
    }

    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO module_responses (
        id, module_id, prompt_id, learner_email, response_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(module_id, prompt_id, learner_email)
      DO UPDATE SET response_text = excluded.response_text, updated_at = excluded.updated_at`,
    )
      .bind(crypto.randomUUID(), moduleId, promptId, user.email, responseText, now, now)
      .run();

    return Response.json({ ok: true, updatedAt: now });
  } catch (error) {
    return jsonError(error);
  }
}
