import type { APIContext } from 'astro';
import { getRuntimeEnv, jsonError, ResponseError } from '../../../lib/runtime';

export const prerender = false;

const CASE_FILE_PREFIX = 'cases/';

export async function GET(context: APIContext): Promise<Response> {
  return handleCaseFileRequest(context, false);
}

export async function HEAD(context: APIContext): Promise<Response> {
  return handleCaseFileRequest(context, true);
}

async function handleCaseFileRequest({ params, locals }: APIContext, headOnly: boolean): Promise<Response> {
  try {
    const env = getRuntimeEnv(locals);
    if (!env.CASE_FILES) throw new ResponseError(500, 'Case file storage is not configured.');

    const key = normalizeCaseFileKey(params.key);
    const object = await env.CASE_FILES.get(`${CASE_FILE_PREFIX}${key}`);

    if (!object) throw new ResponseError(404, 'Case file not found.');

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Length', String(object.size));
    headers.set('ETag', object.httpEtag ?? `"${object.etag}"`);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', contentTypeFor(key));
    }

    if (!headers.has('Content-Disposition')) {
      headers.set('Content-Disposition', `attachment; filename="${downloadNameFor(key)}"`);
    }

    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'private, max-age=3600');
    }

    return new Response(headOnly ? null : object.body, { headers });
  } catch (error) {
    return jsonError(error);
  }
}

function normalizeCaseFileKey(value: string | undefined): string {
  const key = (value ?? '').replaceAll('\\', '/').replace(/^\/+/, '');
  const segments = key.split('/');

  if (
    key.length === 0 ||
    key.length > 512 ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new ResponseError(400, 'Invalid case file path.');
  }

  return key;
}

function downloadNameFor(key: string): string {
  const filename = key.split('/').at(-1) ?? 'case-file';
  return filename.replace(/[^A-Za-z0-9._ -]/g, '_');
}

function contentTypeFor(key: string): string {
  const extension = key.split('.').at(-1)?.toLowerCase();

  switch (extension) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pdf':
      return 'application/pdf';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}
