/** 링크에서 영상 ID(11자)와 재생목록 ID만 뽑아 nocookie 임베드 주소를 직접 만든다 */
export function embedUrl(v: string, autoplay: boolean) {
  const m = v.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})(?![\w-])/)
  const list = v.match(/[?&]list=([\w-]{2,64})/)
  if (!m && !list) return null
  const q = new URLSearchParams()
  if (autoplay) q.set('autoplay', '1')
  if (list) q.set('list', list[1])
  q.set('rel', '0')
  const path = m ? m[1] : 'videoseries'
  return `https://www.youtube-nocookie.com/embed/${path}?${q}`
}
