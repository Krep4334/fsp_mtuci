import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNextPowerOfTwo } from './bracketMath';

describe('getNextPowerOfTwo', () => {
  it('возвращает n, если n уже степень двойки', () => {
    assert.equal(getNextPowerOfTwo(8), 8);
    assert.equal(getNextPowerOfTwo(1), 1);
  });

  it('округляет вверх до степени двойки', () => {
    assert.equal(getNextPowerOfTwo(3), 4);
    assert.equal(getNextPowerOfTwo(5), 8);
    assert.equal(getNextPowerOfTwo(9), 16);
  });

  it('отклоняет неположительные значения', () => {
    assert.throws(() => getNextPowerOfTwo(0));
    assert.throws(() => getNextPowerOfTwo(-1));
  });

  it('корректно для малых n > 1', () => {
    assert.equal(getNextPowerOfTwo(2), 2);
    assert.equal(getNextPowerOfTwo(7), 8);
  });
});
