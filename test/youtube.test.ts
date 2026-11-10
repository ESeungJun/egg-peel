import { test } from 'node:test'
import assert from 'node:assert/strict'
import { embedUrl } from '../src/ui/youtube.ts'

const ID = 'dQw4w9WgXcQ'
test('영상 주소 5종에서 ID를 뽑는다', () => {
  for (const u of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?t=10`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
  ]) assert.equal(embedUrl(u, false), `https://www.youtube-nocookie.com/embed/${ID}?rel=0`, u)
})
test('자동 재생과 재생목록을 붙인다', () => {
  assert.equal(embedUrl(`https://www.youtube.com/watch?v=${ID}&list=PL123abc`, true), `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&list=PL123abc&rel=0`)
  assert.equal(embedUrl('https://www.youtube.com/playlist?list=PL123abc', false), 'https://www.youtube-nocookie.com/embed/videoseries?list=PL123abc&rel=0')
})
test('11자를 넘는 ID, 관계없는 문자열은 거른다', () => {
  assert.equal(embedUrl(`https://youtu.be/${ID}extra`, false), null)
  assert.equal(embedUrl('https://example.com/video', false), null)
  assert.equal(embedUrl('', false), null)
})
test('주소에 섞인 글자는 임베드 주소로 넘어가지 않는다', () => {
  const out = embedUrl(`https://youtu.be/${ID}?x="><script>alert(1)</script>&list=PL1"onload=`, true)!
  assert.match(out, /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?[\w=&-]*$/)
})
