import { describe, expect, it } from 'vitest';

import {
  normalizeImageUrl,
  normalizeLinkUrl,
} from '../../../widgets/markdown/validation';

describe('normalizeLinkUrl', () => {
  it('normalizes standard http and https URLs', () => {
    expect(normalizeLinkUrl('https://example.com')).toEqual({
      valid: true,
      href: 'https://example.com/',
    });
    expect(normalizeLinkUrl('example.com/test')).toEqual({
      valid: true,
      href: 'https://example.com/test',
    });
    expect(normalizeLinkUrl('http://example.org')).toEqual({
      valid: true,
      href: 'http://example.org/',
    });
  });

  it('normalizes explicit file:// URLs including spaces and percent-encoding', () => {
    expect(
      normalizeLinkUrl(
        'file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
      ),
    ).toEqual({
      valid: true,
      href: 'file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
    });

    expect(
      normalizeLinkUrl('file:///home/andrey/Downloads/My Book.pdf'),
    ).toEqual({
      valid: true,
      href: 'file:///home/andrey/Downloads/My%20Book.pdf',
    });
  });

  it('converts absolute POSIX paths into file:// URLs', () => {
    expect(
      normalizeLinkUrl(
        '/home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
      ),
    ).toEqual({
      valid: true,
      href: 'file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
    });

    expect(normalizeLinkUrl('/var/log/app.log')).toEqual({
      valid: true,
      href: 'file:///var/log/app.log',
    });
  });

  it('converts Windows drive paths into file:// URLs', () => {
    expect(normalizeLinkUrl('C:\\Users\\Andrey\\Documents\\book.pdf')).toEqual({
      valid: true,
      href: 'file:///C:/Users/Andrey/Documents/book.pdf',
    });

    expect(normalizeLinkUrl('D:/Media/Document.pdf')).toEqual({
      valid: true,
      href: 'file:///D:/Media/Document.pdf',
    });
  });

  it('rejects empty inputs and web URLs containing unencoded spaces', () => {
    expect(normalizeLinkUrl('')).toEqual({
      valid: false,
      reason: 'empty',
      message: 'URL не должен быть пустым',
    });
    expect(normalizeLinkUrl('   ')).toEqual({
      valid: false,
      reason: 'empty',
      message: 'URL не должен быть пустым',
    });
    expect(normalizeLinkUrl('https://example.com/bad url')).toEqual({
      valid: false,
      reason: 'spaces',
      message: 'URL не должен содержать пробелы',
    });
  });

  it('rejects unsupported protocols and incomplete file paths', () => {
    expect(normalizeLinkUrl('javascript:alert(1)')).toEqual({
      valid: false,
      reason: 'unsupported-protocol',
      message: 'Разрешены только HTTP, HTTPS и локальные file:// ссылки',
    });
    expect(normalizeLinkUrl('data:text/html,bad')).toEqual({
      valid: false,
      reason: 'unsupported-protocol',
      message: 'Разрешены только HTTP, HTTPS и локальные file:// ссылки',
    });
    expect(normalizeLinkUrl('file://')).toEqual({
      valid: false,
      reason: 'invalid',
      message: 'Укажите корректный путь к файлу',
    });
    expect(normalizeLinkUrl('file:///')).toEqual({
      valid: false,
      reason: 'invalid',
      message: 'Укажите корректный путь к файлу',
    });
  });
});

describe('normalizeImageUrl', () => {
  it('allows only HTTPS image URLs', () => {
    expect(normalizeImageUrl('https://example.com/image.png')).toBe(
      'https://example.com/image.png',
    );
    expect(normalizeImageUrl('http://example.com/image.png')).toBeNull();
    expect(normalizeImageUrl('file:///image.png')).toBeNull();
    expect(normalizeImageUrl('javascript:alert(1)')).toBeNull();
  });
});
