import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs')
const pngToIco = require('png-to-ico').default
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pngPath = path.join(root, 'assets', 'app-icon.png')
const icoPath = path.join(root, 'assets', 'app-icon.ico')
const image = PNG.sync.read(fs.readFileSync(pngPath))
const radius = Math.round(Math.min(image.width, image.height) * 0.234375)

for (let y = 0; y < image.height; y += 1) {
  for (let x = 0; x < image.width; x += 1) {
    const cornerX = x < radius ? radius : x >= image.width - radius ? image.width - radius - 1 : null
    const cornerY = y < radius ? radius : y >= image.height - radius ? image.height - radius - 1 : null
    if (cornerX === null || cornerY === null) continue
    const distance = Math.hypot(x - cornerX, y - cornerY)
    const pixel = (y * image.width + x) * 4
    if (distance >= radius + 1) image.data[pixel + 3] = 0
    else if (distance > radius - 1) {
      const coverage = (radius + 1 - distance) / 2
      image.data[pixel + 3] = Math.round(image.data[pixel + 3] * coverage)
    }
  }
}

fs.writeFileSync(pngPath, PNG.sync.write(image))
fs.writeFileSync(icoPath, await pngToIco(pngPath))
