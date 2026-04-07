import { randomBytes } from 'crypto';

export function generateCode(length = 8): string {
  return randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
