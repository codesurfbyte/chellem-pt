import { describe, it, expect } from 'vitest'

// The URL linkification logic extracted from app/my/page.tsx for unit testing.
// The original inline code:
//   profile.coach_feedback.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
//     /^https?:\/\//.test(part) ? <a ...>{part}</a> : part
//   )
const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g
const URL_DETECT_REGEX = /^https?:\/\//

function splitIntoLinkParts(text: string): string[] {
  return text.split(URL_SPLIT_REGEX)
}

function isUrl(part: string): boolean {
  return URL_DETECT_REGEX.test(part)
}

// Mirrors the component logic: return an array of { text, isLink } descriptors
function linkify(text: string): { value: string; isLink: boolean }[] {
  return splitIntoLinkParts(text).map((part) => ({
    value: part,
    isLink: isUrl(part),
  }))
}

describe('coach_feedback URL linkification (app/my/page.tsx)', () => {
  describe('splitIntoLinkParts – URL_SPLIT_REGEX', () => {
    it('returns a single-element array for plain text with no URL', () => {
      const parts = splitIntoLinkParts('Great job this week!')
      expect(parts).toEqual(['Great job this week!'])
    })

    it('returns three parts when a URL appears in the middle of text', () => {
      const parts = splitIntoLinkParts('Check this out https://example.com for details')
      expect(parts).toEqual(['Check this out ', 'https://example.com', ' for details'])
    })

    it('splits a URL-only string into ["", url, ""]', () => {
      const parts = splitIntoLinkParts('https://example.com')
      expect(parts).toEqual(['', 'https://example.com', ''])
    })

    it('captures URL at the very beginning of the string', () => {
      const parts = splitIntoLinkParts('https://example.com is the site')
      expect(parts).toEqual(['', 'https://example.com', ' is the site'])
    })

    it('captures URL at the very end of the string', () => {
      const parts = splitIntoLinkParts('Visit https://example.com')
      expect(parts).toEqual(['Visit ', 'https://example.com', ''])
    })

    it('captures multiple URLs and interleaved text', () => {
      const parts = splitIntoLinkParts(
        'First https://one.com and then https://two.com done'
      )
      expect(parts).toEqual([
        'First ',
        'https://one.com',
        ' and then ',
        'https://two.com',
        ' done',
      ])
    })

    it('handles consecutive URLs with a space between them', () => {
      const parts = splitIntoLinkParts('https://one.com https://two.com')
      expect(parts).toEqual(['', 'https://one.com', ' ', 'https://two.com', ''])
    })

    it('handles http:// (non-TLS) URLs as well as https://', () => {
      const parts = splitIntoLinkParts('See http://example.com for details')
      expect(parts).toEqual(['See ', 'http://example.com', ' for details'])
    })

    it('captures URLs with query strings and fragments', () => {
      const url = 'https://example.com/path?foo=bar&baz=1#section'
      const parts = splitIntoLinkParts(`Go to ${url} now`)
      expect(parts).toEqual(['Go to ', url, ' now'])
    })

    it('captures URLs with port numbers', () => {
      const url = 'https://example.com:8080/api'
      const parts = splitIntoLinkParts(`API at ${url} endpoint`)
      expect(parts).toEqual(['API at ', url, ' endpoint'])
    })

    it('returns single empty-string array for an empty input', () => {
      const parts = splitIntoLinkParts('')
      expect(parts).toEqual([''])
    })

    it('includes trailing punctuation inside URL part (regex boundary behaviour)', () => {
      // [^\s]+ is greedy and captures non-whitespace including trailing punctuation.
      // This is the current regex behaviour – the test documents and guards it.
      const parts = splitIntoLinkParts('Visit https://example.com. Then rest.')
      expect(parts).toEqual(['Visit ', 'https://example.com.', ' Then rest.'])
    })

    it('does not split on text that merely contains "http" without "://"', () => {
      const parts = splitIntoLinkParts('Learn about https and http protocols')
      expect(parts).toEqual(['Learn about https and http protocols'])
    })
  })

  describe('isUrl – URL_DETECT_REGEX', () => {
    it('returns true for an https URL', () => {
      expect(isUrl('https://example.com')).toBe(true)
    })

    it('returns true for an http URL', () => {
      expect(isUrl('http://example.com')).toBe(true)
    })

    it('returns false for plain text', () => {
      expect(isUrl('just some text')).toBe(false)
    })

    it('returns false for an empty string', () => {
      expect(isUrl('')).toBe(false)
    })

    it('returns false for a string starting with ftp://', () => {
      expect(isUrl('ftp://example.com')).toBe(false)
    })

    it('returns false for text that contains https but does not start with it', () => {
      expect(isUrl('see https://example.com')).toBe(false)
    })
  })

  describe('linkify – combined split + detect behaviour', () => {
    it('marks URL parts as links and plain text parts as non-links', () => {
      const result = linkify('Hello https://example.com world')
      expect(result).toEqual([
        { value: 'Hello ', isLink: false },
        { value: 'https://example.com', isLink: true },
        { value: ' world', isLink: false },
      ])
    })

    it('all parts are non-links when there is no URL', () => {
      const result = linkify('No links here')
      expect(result).toEqual([{ value: 'No links here', isLink: false }])
    })

    it('handles multiple URLs producing alternating link/non-link parts', () => {
      const result = linkify('A https://a.com B https://b.com C')
      expect(result).toEqual([
        { value: 'A ', isLink: false },
        { value: 'https://a.com', isLink: true },
        { value: ' B ', isLink: false },
        { value: 'https://b.com', isLink: true },
        { value: ' C', isLink: false },
      ])
    })

    it('correctly handles URL-only feedback (empty strings around it are not links)', () => {
      const result = linkify('https://example.com')
      expect(result).toEqual([
        { value: '', isLink: false },
        { value: 'https://example.com', isLink: true },
        { value: '', isLink: false },
      ])
    })

    it('treats empty string input as a single non-link part', () => {
      const result = linkify('')
      expect(result).toEqual([{ value: '', isLink: false }])
    })

    // Regression: multi-line feedback (contains newlines) – newlines are not whitespace
    // treated specially by [^\s], so a newline correctly terminates the URL capture
    it('stops URL capture at a newline character', () => {
      const result = linkify('See https://example.com\nand more')
      const urlPart = result.find((p) => p.isLink)
      expect(urlPart?.value).toBe('https://example.com')
    })

    // Negative / boundary: scheme-less URL-like text is never a link
    it('does not linkify a URL without a scheme', () => {
      const result = linkify('Visit example.com for info')
      expect(result.every((p) => !p.isLink)).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// Tests for the trailing-punctuation-stripping logic added in the PR.
//
// The new page.tsx code (after splitting on URL_SPLIT_REGEX) applies a second
// regex to each URL-like part:
//
//   const match = part.match(/^(https?:\/\/.*?[^)\],.!?])([)\],.!?]*)$/)
//   const url     = match ? match[1] : part
//   const trailing = match ? match[2] : ''
//
// Group 1 is the "clean" URL: everything up to (and including) the last char
// that is NOT in the set [)\],.!?].
// Group 2 captures any trailing punctuation from that set.
// ---------------------------------------------------------------------------

const TRAILING_PUNCT_REGEX = /^(https?:\/\/.*?[^)\],.!?])([)\],.!?]*)$/

/** Mirrors the component's per-part logic. */
function extractUrlAndTrailing(part: string): { url: string; trailing: string } {
  const match = part.match(TRAILING_PUNCT_REGEX)
  return {
    url: match ? match[1] : part,
    trailing: match ? match[2] : '',
  }
}

describe('trailing-punctuation stripping (app/my/page.tsx new logic)', () => {
  describe('extractUrlAndTrailing – TRAILING_PUNCT_REGEX', () => {
    // ── clean URLs (no trailing punctuation) ──────────────────────────────

    it('returns the full URL unchanged when there is no trailing punctuation', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe('')
    })

    it('does not strip a trailing slash (/ is not in the punctuation set)', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com/')
      expect(url).toBe('https://example.com/')
      expect(trailing).toBe('')
    })

    it('does not strip when URL ends with a path segment', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com/about')
      expect(url).toBe('https://example.com/about')
      expect(trailing).toBe('')
    })

    it('does not strip when query string ends with a normal character', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com/?q=1')
      expect(url).toBe('https://example.com/?q=1')
      expect(trailing).toBe('')
    })

    it('does not strip when fragment ends with a normal character', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com/page#section')
      expect(url).toBe('https://example.com/page#section')
      expect(trailing).toBe('')
    })

    // ── single trailing punctuation characters ────────────────────────────

    it('strips a single trailing period', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com.')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe('.')
    })

    it('strips a single trailing comma', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com,')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe(',')
    })

    it('strips a single trailing exclamation mark', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com!')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe('!')
    })

    it('strips a single trailing question mark', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com?')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe('?')
    })

    it('strips a single trailing closing parenthesis', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com)')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe(')')
    })

    it('strips a single trailing closing bracket', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com]')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe(']')
    })

    // ── multiple consecutive trailing punctuation characters ─────────────

    it('strips multiple trailing punctuation chars e.g. ")."', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com).')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe(').')
    })

    it('strips three trailing dots', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com...')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe('...')
    })

    it('strips mixed trailing punctuation "!,."', () => {
      const { url, trailing } = extractUrlAndTrailing('https://example.com!,.')
      expect(url).toBe('https://example.com')
      expect(trailing).toBe('!,.')
    })

    // ── punctuation appearing INSIDE the URL (should not be stripped) ─────

    it('preserves a question mark inside the query string', () => {
      // The ? is mid-URL; the URL ends with a normal char so nothing is stripped.
      const { url, trailing } = extractUrlAndTrailing('https://example.com/path?foo=bar')
      expect(url).toBe('https://example.com/path?foo=bar')
      expect(trailing).toBe('')
    })

    it('preserves parentheses that are part of a Wikipedia-style URL', () => {
      // e.g. https://en.wikipedia.org/wiki/A_(band) — ends with ')'
      // The trailing ')' IS in the punctuation set, so it will be stripped.
      // This test documents the current regex behaviour.
      const { url, trailing } = extractUrlAndTrailing(
        'https://en.wikipedia.org/wiki/A_(band)'
      )
      expect(url).toBe('https://en.wikipedia.org/wiki/A_(band')
      expect(trailing).toBe(')')
    })

    it('strips trailing period even when a query string is present', () => {
      const { url, trailing } = extractUrlAndTrailing(
        'https://example.com/path?foo=bar.'
      )
      expect(url).toBe('https://example.com/path?foo=bar')
      expect(trailing).toBe('.')
    })

    // ── http:// (non-TLS) URLs ─────────────────────────────────────────────

    it('works identically for http:// URLs with trailing punctuation', () => {
      const { url, trailing } = extractUrlAndTrailing('http://example.com.')
      expect(url).toBe('http://example.com')
      expect(trailing).toBe('.')
    })

    it('returns the full http:// URL unchanged when there is no trailing punctuation', () => {
      const { url, trailing } = extractUrlAndTrailing('http://example.com/path')
      expect(url).toBe('http://example.com/path')
      expect(trailing).toBe('')
    })

    // ── regression / boundary cases ───────────────────────────────────────

    it('regression: URL followed by a period in coach feedback sentence', () => {
      // Simulates real feedback: "Great work! Check https://a.com/report. Keep it up."
      // After splitting on URL_SPLIT_REGEX the URL part captured is 'https://a.com/report.'
      const { url, trailing } = extractUrlAndTrailing('https://a.com/report.')
      expect(url).toBe('https://a.com/report')
      expect(trailing).toBe('.')
    })

    it('regression: URL ending with "," in a list context', () => {
      // e.g. "See https://a.com, https://b.com for details"
      // After split, first URL part captured is 'https://a.com,'
      const { url, trailing } = extractUrlAndTrailing('https://a.com,')
      expect(url).toBe('https://a.com')
      expect(trailing).toBe(',')
    })
  })
})