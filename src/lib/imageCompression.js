function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) {
  if (!file || !file.type.startsWith('image/')) return file

  const isAlreadySmall = file.size <= 180 * 1024
  if (isAlreadySmall) return file

  try {
    const dataUrl = await readFileAsDataUrl(file)
    const img = await loadImage(dataUrl)

    const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
    const canvas = document.createElement('canvas')
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const targetType = file.type === 'image/png' ? 'image/jpeg' : file.type
    const output = canvas.toDataURL(targetType, quality)
    const blob = await fetch(output).then((res) => res.blob())

    const compressedName = file.name.replace(/\.[^.]+$/, '') + (targetType === 'image/jpeg' ? '.jpg' : '.png')
    const compressedFile = new File([blob], compressedName, {
      type: targetType,
      lastModified: Date.now(),
    })

    return compressedFile.size < file.size ? compressedFile : file
  } catch (error) {
    console.warn('Image compression failed, using original file:', error)
    return file
  }
}
