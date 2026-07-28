import { env as cloudflareEnv } from 'cloudflare:workers';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
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

export interface RuntimeEnv {
  DB?: D1Database;
  CASE_FILES?: R2Bucket;
}

export function getRuntimeEnv(locals: App.Locals): RuntimeEnv {
  void locals;
  return cloudflareEnv as RuntimeEnv;
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
