import { env as cloudflareEnv } from 'cloudflare:workers';
import { createRemoteJWKSet, jwtVerify } from 'jose';

interface D1Result<T = unknown> {
  results?: T[];
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2ObjectBody {
  body: ReadableStream;
  size: number;
  etag: string;
  httpEtag?: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
}

export interface ResponseEnv {
  DB?: D1Database;
  CASE_FILES?: R2Bucket;
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;
  FACULTY_EMAILS?: string;
  DEV_LEARNER_EMAIL?: string;
}

export interface AccessUser {
  email: string;
}

export function getRuntimeEnv(locals: App.Locals): ResponseEnv {
  void locals;
  return cloudflareEnv as ResponseEnv;
}

export async function requireAccessUser(request: Request, env: ResponseEnv): Promise<AccessUser> {
  const token = request.headers.get('cf-access-jwt-assertion');
  const hostname = new URL(request.url).hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (!token && (import.meta.env.DEV || isLocalhost)) {
    return { email: env.DEV_LEARNER_EMAIL ?? 'dev.learner@example.edu' };
  }

  if (!token) {
    throw new ResponseError(401, 'Missing Cloudflare Access identity.');
  }

  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) {
    throw new ResponseError(500, 'Cloudflare Access validation is not configured.');
  }

  const jwks = createRemoteJWKSet(new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: env.TEAM_DOMAIN,
    audience: env.POLICY_AUD,
  });

  if (typeof payload.email !== 'string' || payload.email.length === 0) {
    throw new ResponseError(401, 'Cloudflare Access identity did not include an email address.');
  }

  return { email: payload.email.toLowerCase() };
}

export function requireFaculty(email: string, env: ResponseEnv, request: Request): void {
  const hostname = new URL(request.url).hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const facultyEmails = (env.FACULTY_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => !value.startsWith('replace_with_'))
    .filter(Boolean);

  if ((import.meta.env.DEV || isLocalhost) && facultyEmails.length === 0) return;

  if (!facultyEmails.includes(email.toLowerCase())) {
    throw new ResponseError(403, 'Faculty access required.');
  }
}

export class ResponseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof ResponseError || isStatusError(error)) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  return Response.json({ error: 'Unexpected server error.' }, { status: 500 });
}

function isStatusError(error: unknown): error is { message: string; status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error &&
    typeof (error as { status: unknown }).status === 'number' &&
    typeof (error as { message: unknown }).message === 'string'
  );
}
