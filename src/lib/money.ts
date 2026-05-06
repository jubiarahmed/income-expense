import { CURRENCY_SYMBOLS } from '../domain/constants';
import type { CurrencyCode } from '../domain/models';

export function formatMoney(amount: number, currency: CurrencyCode) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
}

export function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
