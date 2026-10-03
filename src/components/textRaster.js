/**
 * Draws a text design item onto a transparent 1024x1024 canvas.
 * Used by the 3D decal (as a texture) and at order time (rasterised to PNG so
 * the print can never re-render differently from what the customer approved).
 */
export const TEXT_RASTER_SIZE = 1024

export function drawTextCanvas(text, fontColor = '#FFFFFF', fontSize = 36, fontFamily = 'Geist') {
  if (!text) return null
  const canvas = document.createElement('canvas')
  canvas.width = TEXT_RASTER_SIZE
  canvas.height = TEXT_RASTER_SIZE
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let fs = Math.max(64, Math.min(220, fontSize * 4.4))
  const setFont = () => { ctx.font = `bold ${fs}px ${fontFamily}, Inter, sans-serif` }
  setFont()
  ctx.fillStyle = fontColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = canvas.width * 0.9
  const words = text.split(' ')
  // Shrink the font until the longest single word fits, so nothing is clipped
  const longest = Math.max(...words.map((w) => ctx.measureText(w).width))
  if (longest > maxWidth) {
    fs = Math.max(16, Math.floor(fs * (maxWidth / longest)))
    setFont()
  }

  const lines = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fs * 1.25
  const totalHeight = lines.length * lineHeight
  const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2
  lines.forEach((line, idx) => {
    ctx.fillText(line, canvas.width / 2, startY + idx * lineHeight)
  })
  return canvas
}

export function textItemToBlob(item) {
  const canvas = drawTextCanvas(item.text, item.textColor, item.textSize, item.textFont)
  if (!canvas) return Promise.resolve(null)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
