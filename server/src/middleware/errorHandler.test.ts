import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, createError, type AppError } from './errorHandler';

describe('createError', () => {
  it('задаёт message и statusCode', () => {
    const err = createError('Сообщение', 422);
    assert.equal(err.message, 'Сообщение');
    assert.equal(err.statusCode, 422);
    assert.equal(err.isOperational, true);
  });

  it('по умолчанию statusCode 500', () => {
    const err = createError('Внутренняя');
    assert.equal(err.statusCode, 500);
  });
});

describe('errorHandler', () => {
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  it('отправляет status и JSON с сообщением', () => {
    let sentStatus = 0;
    let payload: unknown;
    const res = {
      status(code: number) {
        sentStatus = code;
        return this;
      },
      json(body: unknown) {
        payload = body;
      },
    } as unknown as Response;

    const err = createError('Не найдено', 404);
    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);

    assert.equal(sentStatus, 404);
    assert.deepEqual(payload, {
      success: false,
      error: { message: 'Не найдено' },
    });
  });

  it('PrismaClientValidationError → 400 и общий текст', () => {
    let sentStatus = 0;
    let payload: unknown;
    const res = {
      status(code: number) {
        sentStatus = code;
        return this;
      },
      json(body: unknown) {
        payload = body;
      },
    } as unknown as Response;

    const err = new Error('raw') as AppError;
    err.name = 'PrismaClientValidationError';
    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);

    assert.equal(sentStatus, 400);
    assert.equal((payload as { error: { message: string } }).error.message, 'Некорректные данные');
  });

  it('PrismaClientKnownRequestError → 409', () => {
    let sentStatus = 0;
    let payload: unknown;
    const res = {
      status(code: number) {
        sentStatus = code;
        return this;
      },
      json(body: unknown) {
        payload = body;
      },
    } as unknown as Response;

    const err = new Error('unique') as AppError;
    err.name = 'PrismaClientKnownRequestError';
    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);

    assert.equal(sentStatus, 409);
    assert.equal((payload as { error: { message: string } }).error.message, 'Запись уже существует');
  });

  it('в development добавляет stack в ответ', () => {
    const origErr = console.error;
    console.error = () => {};
    try {
      process.env.NODE_ENV = 'development';
      let payload: { error?: { stack?: string } } = {};
      const res = {
        status() {
          return this;
        },
        json(body: unknown) {
          payload = body as typeof payload;
        },
      } as unknown as Response;

      const err = createError('Ошибка', 500);
      errorHandler(err, {} as Request, res, (() => {}) as NextFunction);

      assert.ok(typeof payload.error?.stack === 'string');
    } finally {
      console.error = origErr;
    }
  });
});
