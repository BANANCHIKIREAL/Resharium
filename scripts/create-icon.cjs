const fs = require('fs')
const path = require('path')
const pngToIco = require('png-to-ico').default

const source = path.join(__dirname, '..', 'assets', 'app-icon.png')
const destination = path.join(__dirname, '..', 'assets', 'app-icon.ico')

pngToIco(source)
  .then((buffer) => fs.promises.writeFile(destination, buffer))
  .then(() => console.log(`Icon created: ${destination}`))
  .catch((error) => { console.error(error); process.exitCode = 1 })
