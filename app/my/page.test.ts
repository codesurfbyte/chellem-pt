import { describe, it, expect } from 'vitest'

// The URL splitting and detection logic from app/my/page.tsx:
//   profile.coach_feedback.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
//     /^https?:\/\//.test(part) ? <a href={part}>…</a> : part
//   )
//
// These tests validate that regex correctly identifies and isolates URLs
// within coach feedback text.

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g
const IS_URL = (part: string) => /^https?:\/\//.test(part)

function splitFeedback(text: string): string[] {
  return text.split(URL_SPLIT_REGEX)
}

function classifyParts(text: string): Array<{ value: string; isUrl: boolean }> {
  return splitFeedback(text).map((part) => ({ value: part, isUrl: IS_URL(part) }))
}

describe('coach_feedback URL rendering logic', () => {
  describe('URL detection (IS_URL)', () => {
    it('identifies https URLs', () => {
      expect(IS_URL('https://example.com')).toBe(true)
    })

    it('identifies http URLs', () => {
      expect(IS_URL('http://example.com')).toBe(true)
    })

    it('does not match plain text', () => {
      expect(IS_URL('some plain text')).toBe(false)
    })

    it('does not match empty string', () => {
      expect(IS_URL('')).toBe(false)
    })

    it('does not match partial protocol (ftp://)', () => {
      expect(IS_URL('ftp://example.com')).toBe(false)
    })

    it('does not match text that contains a URL but does not start with one', () => {
      expect(IS_URL('see https://example.com')).toBe(false)
    })
  })

  describe('URL splitting (splitFeedback)', () => {
    it('returns a single-element array for text with no URLs', () => {
      const parts = splitFeedback('No links here.')
      expect(parts).toEqual(['No links here.'])
    })

    it('returns three parts when a URL appears in the middle of text', () => {
      const parts = splitFeedback('Visit https://example.com for more.')
      expect(parts).toEqual(['Visit ', 'https://example.com', ' for more.'])
    })

    it('returns three parts when a URL appears at the start', () => {
      const parts = splitFeedback('https://example.com is the link')
      expect(parts).toEqual(['', 'https://example.com', ' is the link'])
    })

    it('returns three parts when a URL appears at the end', () => {
      const parts = splitFeedback('Check this out: https://example.com')
      expect(parts).toEqual(['Check this out: ', 'https://example.com', ''])
    })

    it('correctly splits multiple URLs', () => {
      const parts = splitFeedback('First https://a.com and then https://b.com done.')
      expect(parts).toEqual([
        'First ',
        'https://a.com',
        ' and then ',
        'https://b.com',
        ' done.',
      ])
    })

    it('handles consecutive URLs separated by whitespace', () => {
      const parts = splitFeedback('https://a.com https://b.com')
      expect(parts).toEqual(['', 'https://a.com', ' ', 'https://b.com', ''])
    })

    it('handles an empty string', () => {
      const parts = splitFeedback('')
      expect(parts).toEqual([''])
    })

    it('handles a string that is only a URL', () => {
      const parts = splitFeedback('https://only-url.com')
      expect(parts).toEqual(['', 'https://only-url.com', ''])
    })
  })

  describe('combined classification (classifyParts)', () => {
    it('marks no parts as URLs when feedback has no links', () => {
      const parts = classifyParts('Great progress today!')
      expect(parts.every((p) => !p.isUrl)).toBe(true)
      expect(parts).toEqual([{ value: 'Great progress today!', isUrl: false }])
    })

    it('marks only the URL part as a link', () => {
      const parts = classifyParts('See https://example.com for details')
      expect(parts).toEqual([
        { value: 'See ', isUrl: false },
        { value: 'https://example.com', isUrl: true },
        { value: ' for details', isUrl: false },
      ])
    })

    it('handles http:// URLs as links', () => {
      const parts = classifyParts('Go to http://example.com now')
      expect(parts).toEqual([
        { value: 'Go to ', isUrl: false },
        { value: 'http://example.com', isUrl: true },
        { value: ' now', isUrl: false },
      ])
    })

    it('handles URLs with query parameters', () => {
      const url = 'https://example.com/path?foo=bar&baz=1'
      const parts = classifyParts(`Link: ${url}`)
      expect(parts).toEqual([
        { value: 'Link: ', isUrl: false },
        { value: url, isUrl: true },
        { value: '', isUrl: false },
      ])
    })

    it('handles URLs with path segments', () => {
      const url = 'https://example.com/a/b/c'
      const parts = classifyParts(url)
      expect(parts).toEqual([
        { value: '', isUrl: false },
        { value: url, isUrl: true },
        { value: '', isUrl: false },
      ])
    })

    it('handles multiline feedback with a URL on a later line', () => {
      const text = '운동 잘 하셨습니다.\n참고 자료: https://example.com\n계속 화이팅!'
      const parts = classifyParts(text)
      expect(parts).toEqual([
        { value: '운동 잘 하셨습니다.\n참고 자료: ', isUrl: false },
        { value: 'https://example.com', isUrl: true },
        { value: '\n계속 화이팅!', isUrl: false },
      ])
    })

    it('handles multiple URLs: all URL parts are marked as links', () => {
      const text = 'A: https://a.com B: https://b.com'
      const parts = classifyParts(text)
      const urlParts = parts.filter((p) => p.isUrl)
      expect(urlParts).toHaveLength(2)
      expect(urlParts[0].value).toBe('https://a.com')
      expect(urlParts[1].value).toBe('https://b.com')
    })

    it('does not treat non-http protocols as URLs', () => {
      const parts = classifyParts('Check ftp://example.com or mailto:a@b.com')
      expect(parts.every((p) => !p.isUrl)).toBe(true)
    })

    // Regression: empty feedback triggers the falsy branch (no feedback message shown),
    // so the splitting logic is never reached for null/undefined values.
    it('splitting an empty string yields a single non-URL empty part', () => {
      const parts = classifyParts('')
      expect(parts).toEqual([{ value: '', isUrl: false }])
    })

    it('URL with trailing punctuation is captured as part of the URL (regex includes non-space chars)', () => {
      // The regex [^\s]+ greedily matches punctuation; trailing period is part of the URL token.
      // This documents the actual behavior so changes to the regex are caught.
      const parts = classifyParts('Visit https://example.com. Great site!')
      const urlPart = parts.find((p) => p.isUrl)
      expect(urlPart?.value).toBe('https://example.com.')
    })

    it('URL with a #fragment is classified as a link', () => {
      const parts = classifyParts('Details at https://example.com/page#section-1 here')
      expect(parts).toEqual([
        { value: 'Details at ', isUrl: false },
        { value: 'https://example.com/page#section-1', isUrl: true },
        { value: ' here', isUrl: false },
      ])
    })

    it('URL with a port number is classified as a link', () => {
      const parts = classifyParts('API at https://api.example.com:8080/v1')
      expect(parts).toEqual([
        { value: 'API at ', isUrl: false },
        { value: 'https://api.example.com:8080/v1', isUrl: true },
        { value: '', isUrl: false },
      ])
    })

    it('uppercase protocol HTTPS:// is not detected as a URL (regex is case-sensitive)', () => {
      // The split regex and IS_URL check only match lowercase https?://
      const parts = classifyParts('HTTPS://example.com is uppercase')
      expect(parts.every((p) => !p.isUrl)).toBe(true)
    })
  })
})