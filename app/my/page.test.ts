import { describe, it, expect } from 'vitest'

// The coach feedback rendering logic from app/my/page.tsx splits text on URLs
// and renders each URL part as an <a> tag and each non-URL part as plain text.
//
// Logic under test (inline in the component):
//   feedback.split(/(https?:\/\/[^\s]+)/g)
//     .map((part) => /^https?:\/\//.test(part) ? <a>{part}</a> : part)

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g
const URL_TEST_REGEX = /^https?:\/\//

/** Mirrors what the component does: split feedback and classify each part. */
function parseFeedbackParts(feedback: string): Array<{ type: 'text' | 'url'; value: string }> {
  return feedback.split(URL_SPLIT_REGEX).map((part) => ({
    type: URL_TEST_REGEX.test(part) ? 'url' : 'text',
    value: part,
  }))
}

describe('coach feedback URL parsing (app/my/page.tsx)', () => {
  describe('URL_SPLIT_REGEX – splitting behaviour', () => {
    it('returns a single text part when there are no URLs', () => {
      const parts = parseFeedbackParts('오늘 운동 잘 하셨습니다!')
      expect(parts).toEqual([{ type: 'text', value: '오늘 운동 잘 하셨습니다!' }])
    })

    it('splits a plain https URL surrounded by text into three parts', () => {
      const parts = parseFeedbackParts('참고 링크: https://example.com 확인해보세요.')
      expect(parts).toHaveLength(3)
      expect(parts[0]).toEqual({ type: 'text', value: '참고 링크: ' })
      expect(parts[1]).toEqual({ type: 'url', value: 'https://example.com' })
      expect(parts[2]).toEqual({ type: 'text', value: ' 확인해보세요.' })
    })

    it('splits a plain http URL into three parts', () => {
      const parts = parseFeedbackParts('링크: http://example.com 끝.')
      expect(parts[1]).toEqual({ type: 'url', value: 'http://example.com' })
    })

    it('handles a feedback string that is only a URL', () => {
      const parts = parseFeedbackParts('https://example.com')
      // split with capturing group around the whole string yields ['', url, '']
      expect(parts.some((p) => p.type === 'url' && p.value === 'https://example.com')).toBe(true)
    })

    it('handles a URL at the very start of the feedback', () => {
      const parts = parseFeedbackParts('https://example.com 나머지 텍스트')
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe('https://example.com')
      const textAfter = parts.find((p) => p.type === 'text' && p.value.includes('나머지'))
      expect(textAfter).toBeDefined()
    })

    it('handles a URL at the very end of the feedback', () => {
      const parts = parseFeedbackParts('운동 영상 보기: https://example.com')
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe('https://example.com')
      const textBefore = parts.find((p) => p.type === 'text' && p.value.includes('운동 영상'))
      expect(textBefore).toBeDefined()
    })

    it('splits multiple URLs in a single string', () => {
      const parts = parseFeedbackParts(
        '첫 번째: https://first.com 두 번째: https://second.com 끝'
      )
      const urls = parts.filter((p) => p.type === 'url')
      expect(urls).toHaveLength(2)
      expect(urls[0].value).toBe('https://first.com')
      expect(urls[1].value).toBe('https://second.com')
    })

    it('preserves all non-URL text segments when multiple URLs are present', () => {
      const parts = parseFeedbackParts('A https://a.com B https://b.com C')
      const texts = parts.filter((p) => p.type === 'text' && p.value.trim() !== '')
      const textValues = texts.map((p) => p.value.trim())
      expect(textValues).toContain('A')
      expect(textValues).toContain('B')
      expect(textValues).toContain('C')
    })

    it('handles an empty string without throwing', () => {
      expect(() => parseFeedbackParts('')).not.toThrow()
      const parts = parseFeedbackParts('')
      // An empty string split gives [''] – one empty text part
      expect(parts).toHaveLength(1)
      expect(parts[0]).toEqual({ type: 'text', value: '' })
    })

    it('includes query parameters and hash fragments as part of the URL', () => {
      const url = 'https://example.com/path?foo=bar&baz=qux#section'
      const parts = parseFeedbackParts(`링크: ${url}`)
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe(url)
    })

    it('includes path segments as part of the URL', () => {
      const url = 'https://example.com/a/b/c'
      const parts = parseFeedbackParts(`보기: ${url} 참고`)
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe(url)
    })

    it('does not classify a bare domain without scheme as a URL', () => {
      const parts = parseFeedbackParts('example.com 이 주소')
      expect(parts.every((p) => p.type === 'text')).toBe(true)
    })

    it('handles consecutive URLs separated only by whitespace', () => {
      const parts = parseFeedbackParts('https://one.com https://two.com')
      const urls = parts.filter((p) => p.type === 'url')
      expect(urls).toHaveLength(2)
      expect(urls[0].value).toBe('https://one.com')
      expect(urls[1].value).toBe('https://two.com')
    })

    it('preserves newlines in non-URL text (whitespace-pre-wrap rendering)', () => {
      const feedback = '첫째 줄\nhttps://example.com\n셋째 줄'
      const parts = parseFeedbackParts(feedback)
      const textParts = parts.filter((p) => p.type === 'text')
      expect(textParts.some((p) => p.value.includes('\n'))).toBe(true)
    })
  })

  describe('URL_TEST_REGEX – URL classification', () => {
    it('classifies https:// strings as URLs', () => {
      expect(URL_TEST_REGEX.test('https://example.com')).toBe(true)
    })

    it('classifies http:// strings as URLs', () => {
      expect(URL_TEST_REGEX.test('http://example.com')).toBe(true)
    })

    it('does not classify plain text as a URL', () => {
      expect(URL_TEST_REGEX.test('just some text')).toBe(false)
    })

    it('does not classify a bare domain as a URL', () => {
      expect(URL_TEST_REGEX.test('example.com')).toBe(false)
    })

    it('does not classify ftp:// or other schemes as URLs', () => {
      expect(URL_TEST_REGEX.test('ftp://example.com')).toBe(false)
    })

    it('does not classify an empty string as a URL', () => {
      expect(URL_TEST_REGEX.test('')).toBe(false)
    })
  })

  describe('roundtrip – split parts reassemble to original text', () => {
    it('rejoining all part values produces the original feedback string', () => {
      const original = '피드백: https://example.com/path?q=1 더 보기: https://more.com 끝'
      const parts = parseFeedbackParts(original)
      const rejoined = parts.map((p) => p.value).join('')
      expect(rejoined).toBe(original)
    })

    it('rejoining plain text (no URLs) is a no-op', () => {
      const original = '일반 텍스트만 있는 피드백입니다.'
      const parts = parseFeedbackParts(original)
      expect(parts.map((p) => p.value).join('')).toBe(original)
    })
  })

  describe('boundary and regression cases', () => {
    it('captures trailing punctuation as part of the URL (non-space chars are included)', () => {
      const parts = parseFeedbackParts('참고: https://example.com. 다음 문장.')
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe('https://example.com.')
    })

    it('includes port numbers as part of the URL', () => {
      const url = 'https://example.com:8080/path'
      const parts = parseFeedbackParts(`서버 주소: ${url} 입니다.`)
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe(url)
    })

    it('handles a tab character as whitespace between text and URL', () => {
      const parts = parseFeedbackParts('링크:\thttps://example.com\t끝')
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe('https://example.com')
    })

    it('does not classify "http" without "://" as a URL', () => {
      const parts = parseFeedbackParts('http 는 프로토콜입니다')
      expect(parts.every((p) => p.type === 'text')).toBe(true)
    })

    it('handles percent-encoded characters in the URL', () => {
      const url = 'https://example.com/path%20with%20spaces?q=hello%20world'
      const parts = parseFeedbackParts(`보기: ${url} 완료`)
      const urlPart = parts.find((p) => p.type === 'url')
      expect(urlPart?.value).toBe(url)
    })

    it('roundtrip is preserved for multiline feedback with multiple URLs', () => {
      const original = '1번 링크: https://first.com\n2번 링크: https://second.com\n끝'
      const parts = parseFeedbackParts(original)
      expect(parts.map((p) => p.value).join('')).toBe(original)
      const urls = parts.filter((p) => p.type === 'url')
      expect(urls).toHaveLength(2)
    })
  })
})