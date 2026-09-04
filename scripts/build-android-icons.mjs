import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'app-icon.png')))
const res = path.join(root, 'android', 'app', 'src', 'main', 'res')

function resize(image, width, height) {
  const output = new PNG({ width, height })
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(((y + 0.5) * image.height) / height))
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(((x + 0.5) * image.width) / width))
      const from = (sourceY * image.width + sourceX) * 4
      const to = (y * width + x) * 4
      image.data.copy(output.data, to, from, from + 4)
    }
  }
  return output
}

function contain(image, size, contentSize, background = [0, 0, 0, 0]) {
  const output = new PNG({ width: size, height: size })
  for (let pixel = 0; pixel < output.data.length; pixel += 4) {
    output.data[pixel] = background[0]
    output.data[pixel + 1] = background[1]
    output.data[pixel + 2] = background[2]
    output.data[pixel + 3] = background[3]
  }
  const resized = resize(image, contentSize, contentSize)
  const offset = Math.floor((size - contentSize) / 2)
  PNG.bitblt(resized, output, 0, 0, contentSize, contentSize, offset, offset)
  return output
}

function maskCircle(image) {
  const output = new PNG({ width: image.width, height: image.height })
  image.data.copy(output.data)
  const centerX = (image.width - 1) / 2
  const centerY = (image.height - 1) / 2
  const radius = Math.min(image.width, image.height) / 2
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (Math.hypot(x - centerX, y - centerY) > radius) {
        output.data[(y * image.width + x) * 4 + 3] = 0
      }
    }
  }
  return output
}

function writePng(file, image) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, PNG.sync.write(image))
}

const densities = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}

for (const [density, size] of Object.entries(densities)) {
  const directory = path.join(res, `mipmap-${density}`)
  const legacy = resize(source, size, size)
  const foreground = contain(source, Math.round(size * 2.25), Math.round(size * 1.52))
  writePng(path.join(directory, 'ic_launcher.png'), legacy)
  writePng(path.join(directory, 'ic_launcher_round.png'), maskCircle(legacy))
  writePng(path.join(directory, 'ic_launcher_foreground.png'), foreground)
}

const splashSizes = {
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 720],
  'drawable-port-xhdpi': [640, 960],
  'drawable-port-xxhdpi': [960, 1440],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [720, 480],
  'drawable-land-xhdpi': [960, 640],
  'drawable-land-xxhdpi': [1440, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
}

for (const [directory, [width, height]] of Object.entries(splashSizes)) {
  const canvas = new PNG({ width, height })
  for (let pixel = 0; pixel < canvas.data.length; pixel += 4) {
    canvas.data[pixel] = 8
    canvas.data[pixel + 1] = 9
    canvas.data[pixel + 2] = 16
    canvas.data[pixel + 3] = 255
  }
  const iconSize = Math.round(Math.min(width, height) * 0.34)
  const icon = resize(source, iconSize, iconSize)
  PNG.bitblt(icon, canvas, 0, 0, iconSize, iconSize, Math.round((width - iconSize) / 2), Math.round((height - iconSize) / 2))
  writePng(path.join(res, directory, 'splash.png'), canvas)
}

writePng(path.join(res, 'drawable-nodpi', 'splash.png'), contain(source, 480, 164, [8, 9, 16, 255]))
console.log('Android launcher icons and splash screens generated.')
