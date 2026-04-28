import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashRefreshToken, generateRefreshToken } from './tokenUtils';

describe('tokenUtils', () => {
  it('hashRefreshToken даёт стабильный SHA-256 в hex', () => {
    const h = hashRefreshToken('same-token');
    assert.match(h, /^[a-f0-9]{64}$/);
    assert.equal(hashRefreshToken('same-token'), h);
  });

  it('generateRefreshToken возвращает токен и хеш', () => {
    const { token, tokenHash } = generateRefreshToken();
    assert.ok(token.length > 10);
    assert.equal(tokenHash, hashRefreshToken(token));
  });
});
