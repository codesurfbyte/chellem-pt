import { describe, it, expect } from 'vitest'

/**
 * Tests for the coach_feedback URL-linkification logic introduced in app/my/page.tsx.
 *
 * The component splits feedback text with /(https?:\/\/[^\s]+)/g and categorises
 * each resulting part:
 *   - parts that match /^https?:\/\// → rendered as <a> links
 *   - all other parts              → rendered as plain text
 *
 * These helpers replicate the exact expressions used in the component so that the
 * tests remain tightly coupled to the actual implementation.
 */

const SPLIT_REGEX = /(https?:\/\/[^\s]+)/g
const URL_REGEX = /^https?:\/\//

function splitFeedback(text: string): string[] {
  return text.split(SPLIT_REGEX)
}

function isUrl(part: string): boolean {
  return URL_REGEX.test(part)
}

/** Mirrors what the component renders: returns an array where each item is either
 *  the string 'link:<url>' (would become an <a>) or 'text:<str>' (plain text). */
function categoriseParts(text: string): string[] {
  return splitFeedback(text).map((part) => (isUrl(part) ? `link:${part}` : `text:${part}`))
}

// ---------------------------------------------------------------------------
// Split regex
// ---------------------------------------------------------------------------

describe('coach_feedback URL split regex', () => {
  it('returns a single element for plain text with no URL', () => {
    const parts = splitFeedback('Great session today!')
    expect(parts).toEqual(['Great session today!'])
  })

  it('returns a single element for an empty string', () => {
    const parts = splitFeedback('')
    expect(parts).toEqual([''])
  })

  it('returns a single element for whitespace-only input', () => {
    const parts = splitFeedback('   ')
    expect(parts).toEqual(['   '])
  })

  it('isolates a URL that is the entire string', () => {
    const parts = splitFeedback('https://example.com')
    // capturing group means the URL itself appears as its own element
    expect(parts).toEqual(['', 'https://example.com', ''])
  })

  it('splits text before a URL from the URL', () => {
    const parts = splitFeedback('Check this out: https://example.com')
    expect(parts).toEqual(['Check this out: ', 'https://example.com', ''])
  })

  it('splits a URL from text that follows it', () => {
    const parts = splitFeedback('https://example.com — great resource')
    expect(parts).toEqual(['', 'https://example.com', ' — great resource'])
  })

  it('splits text before and after a URL', () => {
    const parts = splitFeedback('Visit https://example.com for details')
    expect(parts).toEqual(['Visit ', 'https://example.com', ' for details'])
  })

  it('handles an http:// (non-secure) URL', () => {
    const parts = splitFeedback('See http://example.com/page')
    expect(parts).toEqual(['See ', 'http://example.com/page', ''])
  })

  it('includes query-string parameters in the URL token', () => {
    const parts = splitFeedback('Report: https://example.com/report?id=42&lang=ko')
    expect(parts).toEqual(['Report: ', 'https://example.com/report?id=42&lang=ko', ''])
  })

  it('includes hash fragments in the URL token', () => {
    const parts = splitFeedback('See https://example.com/page#section')
    expect(parts).toEqual(['See ', 'https://example.com/page#section', ''])
  })

  it('handles multiple URLs in the same string', () => {
    const parts = splitFeedback('First https://a.com then https://b.com done')
    expect(parts).toEqual([
      'First ',
      'https://a.com',
      ' then ',
      'https://b.com',
      ' done',
    ])
  })

  it('handles two adjacent URLs separated by whitespace', () => {
    const parts = splitFeedback('https://a.com https://b.com')
    expect(parts).toEqual(['', 'https://a.com', ' ', 'https://b.com', ''])
  })

  it('does not split on bare domains without a scheme', () => {
    const parts = splitFeedback('Visit example.com for more')
    expect(parts).toEqual(['Visit example.com for more'])
  })

  it('does not split on ftp:// URLs (outside the supported schemes)', () => {
    const parts = splitFeedback('File at ftp://files.example.com/data.zip')
    expect(parts).toEqual(['File at ftp://files.example.com/data.zip'])
  })

  it('preserves newlines in surrounding text', () => {
    const parts = splitFeedback('Line 1\nCheck https://example.com\nLine 3')
    expect(parts).toEqual(['Line 1\nCheck ', 'https://example.com', '\nLine 3'])
  })
})

// ---------------------------------------------------------------------------
// URL detection predicate
// ---------------------------------------------------------------------------

describe('URL detection predicate (/^https?:\\/\\//)', () => {
  it('recognises an https URL', () => {
    expect(isUrl('https://example.com')).toBe(true)
  })

  it('recognises an http URL', () => {
    expect(isUrl('http://example.com')).toBe(true)
  })

  it('rejects a plain text segment', () => {
    expect(isUrl('Visit this link')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isUrl('')).toBe(false)
  })

  it('rejects a bare domain', () => {
    expect(isUrl('example.com')).toBe(false)
  })

  it('rejects an ftp URL', () => {
    expect(isUrl('ftp://files.example.com')).toBe(false)
  })

  it('rejects a string that contains but does not start with a URL', () => {
    expect(isUrl('go to https://example.com')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Combined categorisation (mirrors component render logic)
// ---------------------------------------------------------------------------

describe('coach_feedback render categorisation', () => {
  it('renders plain text as a text node', () => {
    expect(categoriseParts('No links here.')).toEqual(['text:No links here.'])
  })

  it('renders a standalone URL as a link', () => {
    expect(categoriseParts('https://example.com')).toEqual([
      'text:',
      'link:https://example.com',
      'text:',
    ])
  })

  it('renders surrounding text as text nodes and URL as a link', () => {
    expect(categoriseParts('Click https://example.com now')).toEqual([
      'text:Click ',
      'link:https://example.com',
      'text: now',
    ])
  })

  it('renders multiple URLs as separate link nodes', () => {
    expect(categoriseParts('A https://a.com B https://b.com')).toEqual([
      'text:A ',
      'link:https://a.com',
      'text: B ',
      'link:https://b.com',
      'text:',
    ])
  })

  it('preserves multi-line text structure', () => {
    const input = '잘 하셨습니다!\n참고: https://example.com/plan\n다음 주도 화이팅'
    expect(categoriseParts(input)).toEqual([
      'text:잘 하셨습니다!\n참고: ',
      'link:https://example.com/plan',
      'text:\n다음 주도 화이팅',
    ])
  })

  it('handles a URL with query params and fragment as a single link', () => {
    const input = 'Report https://example.com/r?q=1&lang=ko#top end'
    expect(categoriseParts(input)).toEqual([
      'text:Report ',
      'link:https://example.com/r?q=1&lang=ko#top',
      'text: end',
    ])
  })

  // Regression: ensure a feedback string without any URL is not accidentally split
  it('regression: feedback with punctuation but no URL is never split into link parts', () => {
    const parts = categoriseParts('Good work! See you on Monday :)')
    expect(parts.every((p) => p.startsWith('text:'))).toBe(true)
  })

  // Boundary: single-character text segment between two URLs
  it('boundary: single-space segment between two consecutive URLs is a text node', () => {
    const parts = categoriseParts('https://a.com https://b.com')
    const textParts = parts.filter((p) => p.startsWith('text:'))
    const linkParts = parts.filter((p) => p.startsWith('link:'))
    expect(linkParts).toHaveLength(2)
    // The space between the two URLs must be a plain text node, not a link
    expect(textParts.some((p) => p === 'text: ')).toBe(true)
  })
})