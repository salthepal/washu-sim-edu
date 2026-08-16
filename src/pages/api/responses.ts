import type { APIContext } from 'astro';
import { moduleResponsePrompts } from '../../data/moduleResponsePrompts';
import { getAnonymousLearner, getRuntimeEnv, jsonError, ResponseError } from '../../lib/access';
import { responseWriteAllowed } from '../../lib/responseSecurity';

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
    if (!env.RESPONSE_IP_RATE_LIMITER || !env.RESPONSE_LEARNER_RATE_LIMITER) {
      throw new ResponseError(500, 'Response rate limiting is not configured.');
    }

    const learner = getAnonymousLearner(request);
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

    const module = moduleResponsePrompts[moduleId as keyof typeof moduleResponsePrompts];
    if (!module) throw new ResponseError(404, 'Module not found.');

    const prompt = module[promptId as keyof typeof module];
    if (!prompt) throw new ResponseError(404, 'Prompt not found.');

    if (prompt.required && responseText.length === 0) {
      throw new ResponseError(400, 'Response text is required.');
    }

    const writeAllowed = await responseWriteAllowed(
      request,
      learner.id,
      env.RESPONSE_IP_RATE_LIMITER,
      env.RESPONSE_LEARNER_RATE_LIMITER,
    );
    if (!writeAllowed) {
      throw new ResponseError(429, 'Too many response updates. Please wait a minute and try again.');
    }

    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO module_responses (
        id, module_id, prompt_id, learner_email, response_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(module_id, prompt_id, learner_email)
      DO UPDATE SET response_text = excluded.response_text, updated_at = excluded.updated_at`,
    )
      .bind(crypto.randomUUID(), moduleId, promptId, learner.id, responseText, now, now)
      .run();

    const headers = learner.setCookie ? { 'Set-Cookie': learner.setCookie } : undefined;
    return Response.json({ ok: true, updatedAt: now }, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
