import { createHash } from 'crypto';

export function hashRequest(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
