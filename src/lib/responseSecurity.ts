export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export async function responseWriteAllowed(
  request: Request,
  learnerId: string,
  ipRateLimiter: RateLimiter,
  learnerRateLimiter: RateLimiter,
): Promise<boolean> {
  const clientIp = request.headers.get('cf-connecting-ip')?.trim();
  const ipKey = clientIp || `local:${new URL(request.url).hostname}`;
  const [ipOutcome, learnerOutcome] = await Promise.all([
    ipRateLimiter.limit({ key: `response-ip:${ipKey}` }),
    learnerRateLimiter.limit({ key: `response-learner:${learnerId}` }),
  ]);

  return ipOutcome.success && learnerOutcome.success;
}

export function csvEscape(value: string): string {
  const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}
