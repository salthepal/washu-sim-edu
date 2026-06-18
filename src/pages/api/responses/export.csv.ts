import type { APIContext } from 'astro';
import { getRuntimeEnv, jsonError, requireAccessUser, requireFaculty, ResponseError } from '../../../lib/access';

export const prerender = false;

interface ModuleResponseRow {
  module_id: string;
  prompt_id: string;
  learner_email: string;
  response_text: string;
  created_at: string;
  updated_at: string;
}

export async function GET({ request, locals }: APIContext): Promise<Response> {
  try {
    const env = getRuntimeEnv(locals);
    if (!env.DB) throw new ResponseError(500, 'Response database is not configured.');

    const user = await requireAccessUser(request, env);
    requireFaculty(user.email, env, request);

    const result = await env.DB.prepare(
      `SELECT module_id, prompt_id, learner_email, response_text, created_at, updated_at
       FROM module_responses
       ORDER BY module_id, prompt_id, learner_email`,
    ).all<ModuleResponseRow>();

    const rows: ModuleResponseRow[] = result.results ?? [];
    const csv = [
      ['module_id', 'prompt_id', 'learner_email', 'response_text', 'created_at', 'updated_at'],
      ...rows.map((row) => [
        row.module_id,
        row.prompt_id,
        row.learner_email,
        row.response_text,
        row.created_at,
        row.updated_at,
      ]),
    ]
      .map((row) => row.map(csvEscape).join(','))
      .join('\r\n');

    return new Response(`${csv}\r\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="module-responses.csv"',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
