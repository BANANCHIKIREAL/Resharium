const path = require('node:path')
const { app, nativeImage } = require('electron')

app.whenReady().then(() => {
  const iconPath = path.join(__dirname, '..', 'assets', 'app-icon.ico')
  const icon = nativeImage.createFromPath(iconPath)

  if (icon.isEmpty()) {
    throw new Error('Windows icon could not be decoded')
  }

  const bitmap = icon.resize({ width: 256, height: 256 }).toBitmap()
  const alphaAt = (x, y) => bitmap[(y * 256 + x) * 4 + 3]
  const result = {
    size: icon.getSize(),
    cornerAlpha: alphaAt(0, 0),
    edgeAlpha: alphaAt(128, 0),
    centerAlpha: alphaAt(128, 128),
  }

  console.log(JSON.stringify(result))
  app.quit()
})
