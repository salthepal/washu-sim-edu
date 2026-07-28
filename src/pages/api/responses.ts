import type { APIContext } from 'astro';
import { moduleResponsePrompts } from '../../data/moduleResponsePrompts';
import { getRuntimeEnv, jsonError, ResponseError } from '../../lib/runtime';

export const prerender = false;

const MAX_RESPONSE_LENGTH = 4000;
const RESPONSE_TIME_ZONE = 'America/Chicago';

function getResponsePeriod(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESPONSE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('Unable to determine the response month.');
  }

  return {
    key: `${year}-${month}`,
    label: new Intl.DateTimeFormat('en-US', {
      timeZone: RESPONSE_TIME_ZONE,
      month: 'long',
      year: 'numeric',
    }).format(date),
  };
}

interface ResponsePayload {
  moduleId?: unknown;
  promptId?: unknown;
  responseText?: unknown;
}

export async function POST({ request, locals }: APIContext): Promise<Response> {
  try {
    const env = getRuntimeEnv(locals);
    if (!env.DB) throw new ResponseError(500, 'Response database is not configured.');

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

    const submittedAt = new Date();
    const now = submittedAt.toISOString();
    const responsePeriod = getResponsePeriod(submittedAt);
    const residentId = `resident-${responsePeriod.key}`;

    await env.DB.prepare(
      `INSERT INTO module_responses (
        id, module_id, prompt_id, learner_email, response_text, created_at, updated_at, response_month
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(module_id, prompt_id, learner_email)
      DO UPDATE SET
        response_text = excluded.response_text,
        updated_at = excluded.updated_at,
        response_month = excluded.response_month`,
    )
      .bind(
        crypto.randomUUID(),
        moduleId,
        promptId,
        residentId,
        responseText,
        now,
        now,
        responsePeriod.key,
      )
      .run();

    return Response.json({
      ok: true,
      updatedAt: now,
      responseMonth: responsePeriod.key,
      responseMonthLabel: responsePeriod.label,
    });
  } catch (error) {
    return jsonError(error);
  }
}
