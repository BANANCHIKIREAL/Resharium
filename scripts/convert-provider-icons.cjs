const fs = require('node:fs')
const path = require('node:path')
const { app, nativeImage } = require('electron')

const iconDirectory = path.join(__dirname, '..', 'assets', 'providers')
const iconNames = ['gdz-online', 'megaresheba']

app.whenReady().then(() => {
  fs.copyFileSync(path.join(iconDirectory, 'resheba.ico'), path.join(iconDirectory, 'resheba.png'))

  for (const name of iconNames) {
    const source = path.join(iconDirectory, `${name}.ico`)
    const target = path.join(iconDirectory, `${name}.png`)
    const image = nativeImage.createFromPath(source)

    if (image.isEmpty()) {
      throw new Error(`Could not decode ${source}`)
    }

    fs.writeFileSync(target, image.resize({ width: 64, height: 64, quality: 'best' }).toPNG())
  }

  app.quit()
})
