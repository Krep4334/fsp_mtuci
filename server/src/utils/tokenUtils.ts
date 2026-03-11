import crypto from 'crypto';

const REFRESH_TOKEN_BYTES = 32;

/**
 * Генерирует случайный refresh-токен и его SHA-256 хеш.
 * Хеш хранится в БД для поиска и отзыва; клиенту отдаётся только сам токен.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const tokenHash = hashRefreshToken(token);
  return { token, tokenHash };
}

/** Хеш refresh-токена для поиска в БД (тот же алгоритм, что при создании). */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
