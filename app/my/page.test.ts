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

    // Regression: real-world PT coach feedback in Korean with embedded URL
    it('correctly linkifies a URL embedded in Korean text', () => {
      const result = linkify('오늘 운동 영상 참고하세요 https://youtube.com/watch?v=abc123 수고하셨습니다')
      expect(result).toEqual([
        { value: '오늘 운동 영상 참고하세요 ', isLink: false },
        { value: 'https://youtube.com/watch?v=abc123', isLink: true },
        { value: ' 수고하셨습니다', isLink: false },
      ])
    })

    // Boundary: tab character acts as whitespace and terminates URL capture
    it('stops URL capture at a tab character', () => {
      const result = linkify('Check\thttps://example.com\there')
      const urlPart = result.find((p) => p.isLink)
      expect(urlPart?.value).toBe('https://example.com')
    })

    // Regression: URL with parentheses in path (e.g. Wikipedia-style links) –
    // [^\s]+ is greedy so parentheses are included inside the URL token.
    it('captures parentheses as part of the URL token (documents greedy boundary behaviour)', () => {
      const url = 'https://en.wikipedia.org/wiki/Squat_(exercise)'
      const result = linkify(`Read ${url} for technique`)
      const urlPart = result.find((p) => p.isLink)
      expect(urlPart?.value).toBe(url)
    })

    // Negative: whitespace-only feedback string produces no link parts
    it('produces no link parts for whitespace-only feedback', () => {
      const result = linkify('   ')
      expect(result.every((p) => !p.isLink)).toBe(true)
    })
  })
})