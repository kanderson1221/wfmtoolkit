export const downloadTextFile = (
  fileName,
  text,
  mimeType = 'text/plain;charset=utf-8'
) => {
  const blob = new Blob([text], { type: mimeType })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = downloadUrl
  link.download = fileName

  try {
    link.click()
  } finally {
    URL.revokeObjectURL(downloadUrl)
  }
}
