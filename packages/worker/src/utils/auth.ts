import { verify } from 'hono/jwt';

export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ServiceError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden') {
    return new ServiceError(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = 'Not Found') {
    return new ServiceError(message, 404, 'NOT_FOUND');
  }

  static badRequest(message: string = 'Bad Request') {
    return new ServiceError(message, 400, 'BAD_REQUEST');
  }
}

export async function verifyJwtToken(token: string, secret: string | null): Promise<string> {
  if (!secret) {
    throw ServiceError.unauthorized('JWT secret not configured');
  }

  try {
    const payload = await verify(token, secret, 'HS256');

    if (!payload || typeof payload !== 'object' || !('userId' in payload)) {
      throw ServiceError.unauthorized('Invalid token payload');
    }

    return String(payload.userId);
  } catch (error) {
    console.error(`Error verifying JWT: ${error}`);
    throw ServiceError.unauthorized('Error verifying JWT');
  }
}

export async function extractUserIdFromRequest(request: Request, jwtSecret: string | null): Promise<string> {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyJwtToken(token, jwtSecret);
  }

  // Try to get token from query parameter (for WebSocket connections)
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token) {
    return verifyJwtToken(token, jwtSecret);
  }

  throw ServiceError.unauthorized('No valid authentication token provided');
}