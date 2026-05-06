import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';

export function ok(response: VercelResponse, body: unknown = { ok: true }) {
  return response.status(200).json(body);
}

export function created(response: VercelResponse, body: unknown = { ok: true }) {
  return response.status(201).json(body);
}

export function fail(response: VercelResponse, status: number, message: string) {
  return response.status(status).json({ error: message });
}

export function handleError(response: VercelResponse, error: unknown) {
  if (error instanceof ZodError) {
    return fail(response, 400, error.issues[0]?.message ?? 'Invalid request.');
  }
  if (error instanceof Error) {
    const status = error.message.includes('permission') || error.message.includes('Superadmin') ? 403 : 400;
    return fail(response, status, error.message);
  }
  return fail(response, 500, 'Unexpected server error.');
}

export function readAction(request: VercelRequest) {
  return String(request.query.action ?? request.body?.action ?? '');
}

export function setNoStore(response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
}
