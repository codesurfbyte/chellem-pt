import { describe, it, expect } from 'vitest'

// The changed code in app/my/page.tsx uses these two expressions to render
// coach_feedback text with clickable links:
//
//   text.split(/(https?:\/\/[^\s]+)/g)
//   /^https?:\/\//.test(part)
//
// These tests verify that logic directly.

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g
const URL_MATCH_REGEX = /^https?:\/\//

/**
 * Mirrors the rendering logic from app/my/page.tsx:
 * Split feedback text into URL and non-URL parts.
 */
function splitFeedbackParts(text: string): string[] {
  return text.split(URL_SPLIT_REGEX)
}

/**
 * Mirrors the classification logic from app/my/page.tsx:
 * Returns true if the given part should be rendered as a link.
 */
function isUrl(part: string): boolean {
  return URL_MATCH_REGEX.test(part)
}

describe('coach feedback URL rendering logic (app/my/page.tsx)', () => {
  describe('splitFeedbackParts — URL_SPLIT_REGEX', () => {
    it('returns a single-element array when there are no URLs', () => {
      const parts = splitFeedbackParts('Great workout today!')
      expect(parts).toEqual(['Great workout today!'])
    })

    it('splits text around an https URL', () => {
      const parts = splitFeedbackParts('Check this: https://example.com great job')
      expect(parts).toEqual(['Check this: ', 'https://example.com', ' great job'])
    })

    it('splits text around an http URL', () => {
      const parts = splitFeedbackParts('See http://example.com for details')
      expect(parts).toEqual(['See ', 'http://example.com', ' for details'])
    })

    it('captures a URL that appears at the very start of the text', () => {
      const parts = splitFeedbackParts('https://example.com is the link')
      expect(parts).toEqual(['', 'https://example.com', ' is the link'])
    })

    it('captures a URL that appears at the very end of the text', () => {
      const parts = splitFeedbackParts('Visit us at https://example.com')
      expect(parts).toEqual(['Visit us at ', 'https://example.com', ''])
    })

    it('captures a text that is only a URL', () => {
      const parts = splitFeedbackParts('https://example.com')
      expect(parts).toEqual(['', 'https://example.com', ''])
    })

    it('captures multiple URLs within the same text', () => {
      const parts = splitFeedbackParts(
        'First: https://one.com then https://two.com done'
      )
      expect(parts).toEqual([
        'First: ',
        'https://one.com',
        ' then ',
        'https://two.com',
        ' done',
      ])
    })

    it('captures a URL with a path, query string and fragment', () => {
      const text = 'Details at https://example.com/path?q=1&r=2#section here'
      const parts = splitFeedbackParts(text)
      expect(parts).toContain('https://example.com/path?q=1&r=2#section')
    })

    it('captures a URL that contains a port number', () => {
      const parts = splitFeedbackParts('Server: https://localhost:8080/api')
      expect(parts).toContain('https://localhost:8080/api')
    })

    it('does NOT split on ftp:// or other non-http(s) schemes', () => {
      const parts = splitFeedbackParts('File at ftp://example.com/file')
      // ftp:// should not be recognised — the whole string stays together
      expect(parts).toEqual(['File at ftp://example.com/file'])
    })

    it('handles an empty string without throwing', () => {
      const parts = splitFeedbackParts('')
      expect(parts).toEqual([''])
    })

    it('handles text with newlines (whitespace-pre-wrap context)', () => {
      const text = 'Line one\nhttps://example.com\nLine three'
      const parts = splitFeedbackParts(text)
      expect(parts).toEqual(['Line one\n', 'https://example.com', '\nLine three'])
    })

    it('treats each consecutive URL as a separate capture group', () => {
      // Two URLs with no text between them
      const parts = splitFeedbackParts('https://a.com https://b.com')
      expect(parts).toEqual(['', 'https://a.com', ' ', 'https://b.com', ''])
    })
  })

  describe('isUrl — URL_MATCH_REGEX', () => {
    it('returns true for an https:// URL', () => {
      expect(isUrl('https://example.com')).toBe(true)
    })

    it('returns true for an http:// URL', () => {
      expect(isUrl('http://example.com')).toBe(true)
    })

    it('returns true for a URL with a path', () => {
      expect(isUrl('https://example.com/path/to/page')).toBe(true)
    })

    it('returns true for a URL with a query string', () => {
      expect(isUrl('https://example.com?foo=bar')).toBe(true)
    })

    it('returns false for plain text', () => {
      expect(isUrl('Great workout today!')).toBe(false)
    })

    it('returns false for an empty string', () => {
      expect(isUrl('')).toBe(false)
    })

    it('returns false for an ftp:// scheme', () => {
      expect(isUrl('ftp://example.com')).toBe(false)
    })

    it('returns false for a string that merely contains a URL rather than starting with one', () => {
      expect(isUrl('See https://example.com')).toBe(false)
    })

    it('returns false for a partial match like "http" without "://"', () => {
      expect(isUrl('http example')).toBe(false)
    })
  })

  describe('combined split + classify flow', () => {
    it('correctly identifies all URL and text parts for mixed feedback', () => {
      const feedback =
        'Good session! Watch this video: https://youtube.com/watch?v=abc123 and this article: https://blog.example.com/post keep it up'

      const parts = splitFeedbackParts(feedback)
      const urlParts = parts.filter(isUrl)
      const textParts = parts.filter((p) => !isUrl(p))

      expect(urlParts).toEqual([
        'https://youtube.com/watch?v=abc123',
        'https://blog.example.com/post',
      ])
      expect(textParts).toEqual([
        'Good session! Watch this video: ',
        ' and this article: ',
        ' keep it up',
      ])
    })

    it('produces zero URL parts when feedback has no URLs', () => {
      const feedback = 'Keep up the good work and focus on form.'
      const parts = splitFeedbackParts(feedback)
      expect(parts.filter(isUrl)).toHaveLength(0)
    })

    it('produces zero text parts (all empty strings) when feedback is a single URL', () => {
      const feedback = 'https://example.com'
      const parts = splitFeedbackParts(feedback)
      const urlParts = parts.filter(isUrl)
      const textParts = parts.filter((p) => !isUrl(p))

      expect(urlParts).toEqual(['https://example.com'])
      // split with a capturing group always produces empty-string boundaries
      expect(textParts.every((p) => p === '')).toBe(true)
    })

    it('round-trips: joining all parts reconstructs the original text', () => {
      const feedback =
        'Before https://first.com middle https://second.com/path?a=1 after'
      const parts = splitFeedbackParts(feedback)
      expect(parts.join('')).toBe(feedback)
    })
  })
})