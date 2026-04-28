import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';

const router = Router();

const QUOTE_URL = 'https://api.quotable.io/random';
/** Запасной источник, если Quotable недоступен (сеть, DNS, блокировка). */
const QUOTE_FALLBACK_URL = 'https://dummyjson.com/quotes/random';
const FETCH_TIMEOUT_MS = 8000;

type QuotePayload = { text: string; author: string; source: string };

function parseQuotable(data: unknown): { text: string; author: string } | null {
  const d = data as { content?: string; author?: string };
  if (!d.content || !d.author) return null;
  return { text: d.content, author: d.author };
}

function parseDummyJson(data: unknown): { text: string; author: string } | null {
  const d = data as { quote?: string; author?: string };
  if (!d.quote || !d.author) return null;
  return { text: d.quote, author: d.author };
}

async function tryFetchQuote(
  url: string,
  parse: (data: unknown) => { text: string; author: string } | null,
  sourceLabel: string,
): Promise<QuotePayload | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const data: unknown = await r.json();
    const parsed = parse(data);
    if (!parsed) return null;
    return { text: parsed.text, author: parsed.author, source: sourceLabel };
  } catch {
    clearTimeout(t);
    return null;
  }
}

/**
 * Прокси к сторонним API цитат (без ключей на клиенте).
 * Сначала Quotable, при сбое сети/ответа — DummyJSON.
 */
router.get('/quote', async (_req: Request, res: Response, next: NextFunction) => {
  let result = await tryFetchQuote(QUOTE_URL, parseQuotable, 'api.quotable.io');

  if (!result) {
    result = await tryFetchQuote(QUOTE_FALLBACK_URL, parseDummyJson, 'dummyjson.com');
  }

  if (!result) {
    return next(
      createError('Не удалось получить цитату: внешние API недоступны или ответ некорректен', 502),
    );
  }

  res.json({
    success: true,
    quote: { text: result.text, author: result.author },
    source: result.source,
  });
});

export default router;
