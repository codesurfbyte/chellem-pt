import { describe, it, expect } from 'vitest'

/**
 * Tests for the URL-splitting logic used in app/my/page.tsx to render
 * coach_feedback text with clickable hyperlinks.
 *
 * The component applies this transformation:
 *   text.split(/(https?:\/\/[^\s]+)/g)
 *     .map(part => /^https?:\/\//.test(part) ? <a href={part}>...</a> : part)
 */

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g
const URL_MATCH_REGEX = /^https?:\/\//

function splitFeedbackParts(feedback: string): string[] {
  return feedback.split(URL_SPLIT_REGEX)
}

function isUrlPart(part: string): boolean {
  return URL_MATCH_REGEX.test(part)
}

describe('coach_feedback URL link rendering logic', () => {
  describe('splitFeedbackParts', () => {
    it('returns a single part for plain text with no URLs', () => {
      const parts = splitFeedbackParts('Great progress this week!')
      expect(parts).toEqual(['Great progress this week!'])
    })

    it('splits a single URL out of surrounding text', () => {
      const parts = splitFeedbackParts('Check this out: https://example.com for details')
      expect(parts).toEqual([
        'Check this out: ',
        'https://example.com',
        ' for details',
      ])
    })

    it('splits multiple URLs from a mixed-content string', () => {
      const parts = splitFeedbackParts(
        'Watch https://youtube.com/abc and read https://docs.example.com/guide'
      )
      expect(parts).toEqual([
        'Watch ',
        'https://youtube.com/abc',
        ' and read ',
        'https://docs.example.com/guide',
        '',
      ])
    })

    it('handles a URL at the start of the text', () => {
      const parts = splitFeedbackParts('https://example.com is a great resource')
      expect(parts).toEqual(['', 'https://example.com', ' is a great resource'])
    })

    it('handles a URL at the end of the text', () => {
      const parts = splitFeedbackParts('More info at https://example.com')
      expect(parts).toEqual(['More info at ', 'https://example.com', ''])
    })

    it('handles a string that is only a URL', () => {
      const parts = splitFeedbackParts('https://example.com')
      expect(parts).toEqual(['', 'https://example.com', ''])
    })

    it('handles http:// URLs (not just https://)', () => {
      const parts = splitFeedbackParts('Visit http://example.com today')
      expect(parts).toEqual(['Visit ', 'http://example.com', ' today'])
    })

    it('returns an empty array element for an empty string', () => {
      const parts = splitFeedbackParts('')
      expect(parts).toEqual([''])
    })

    it('includes query strings and fragments in URL parts', () => {
      const parts = splitFeedbackParts('See https://example.com/page?q=1&ref=2#section here')
      expect(parts).toEqual([
        'See ',
        'https://example.com/page?q=1&ref=2#section',
        ' here',
      ])
    })

    it('stops URL at whitespace boundary', () => {
      const parts = splitFeedbackParts('Go to https://a.com then https://b.com now')
      expect(parts).toEqual([
        'Go to ',
        'https://a.com',
        ' then ',
        'https://b.com',
        ' now',
      ])
    })
  })

  describe('isUrlPart', () => {
    it('returns true for https:// parts', () => {
      expect(isUrlPart('https://example.com')).toBe(true)
    })

    it('returns true for http:// parts', () => {
      expect(isUrlPart('http://example.com')).toBe(true)
    })

    it('returns false for plain text', () => {
      expect(isUrlPart('Great progress this week!')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isUrlPart('')).toBe(false)
    })

    it('returns false for text that contains a URL but does not start with one', () => {
      expect(isUrlPart('See https://example.com')).toBe(false)
    })

    it('returns false for ftp:// URLs (not supported by the component)', () => {
      expect(isUrlPart('ftp://example.com')).toBe(false)
    })
  })

  describe('combined split-and-classify logic', () => {
    it('correctly classifies each part for mixed content', () => {
      const feedback = 'Feedback: https://example.com and keep it up!'
      const parts = splitFeedbackParts(feedback)
      const classified = parts.map((p) => ({ part: p, isUrl: isUrlPart(p) }))
      expect(classified).toEqual([
        { part: 'Feedback: ', isUrl: false },
        { part: 'https://example.com', isUrl: true },
        { part: ' and keep it up!', isUrl: false },
      ])
    })

    it('all parts of a plain-text feedback are non-URL', () => {
      const feedback = 'Good work today, no links here.'
      const parts = splitFeedbackParts(feedback)
      expect(parts.every((p) => !isUrlPart(p))).toBe(true)
    })

    it('URL parts extracted from a multi-URL feedback all pass isUrlPart', () => {
      const feedback = 'See https://a.com and https://b.com for info'
      const parts = splitFeedbackParts(feedback)
      const urlParts = parts.filter(isUrlPart)
      expect(urlParts).toEqual(['https://a.com', 'https://b.com'])
    })

    it('non-URL parts are preserved verbatim across a multi-URL split', () => {
      const feedback = 'Intro https://x.com middle https://y.com end'
      const parts = splitFeedbackParts(feedback)
      const textParts = parts.filter((p) => !isUrlPart(p))
      expect(textParts).toEqual(['Intro ', ' middle ', ' end'])
    })
  })
})