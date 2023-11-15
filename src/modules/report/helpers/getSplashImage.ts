import mime from 'mime-types'

export function getSplashImageHTML(pageBreakBefore = true, image: string): string {
  const mimeType = mime.lookup(image) || ''

  if (image && !mimeType.startsWith('video/')) {
    return `
      <div class="splash-image" style="${pageBreakBefore ? 'page-break-before: always;' : ''}">
        <img src="${image}" alt="Splash Activity">
      </div>
    `
  } else if (pageBreakBefore) {
    return `<div style="page-break-before: always"/>`
  }

  return ''
}
