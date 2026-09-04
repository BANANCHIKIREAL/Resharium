import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const androidRoot = path.join(root, 'android')
const keystore = path.join(androidRoot, 'resharium-release.jks')
const properties = path.join(androidRoot, 'keystore.properties')
const recoveryDirectory = path.join(root, '.tools', 'signing')
const recovery = path.join(recoveryDirectory, 'ВАЖНО-ключ-Android.txt')

if (fs.existsSync(keystore) && fs.existsSync(properties)) {
  console.log('Existing Android release key will be reused.')
  process.exit(0)
}

const javaHome = process.env.JAVA_HOME
if (!javaHome) throw new Error('JAVA_HOME must point to JDK 21')

const password = crypto.randomBytes(36).toString('base64url')
const keytool = path.join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool')
const result = spawnSync(keytool, [
  '-genkeypair',
  '-v',
  '-keystore', keystore,
  '-storepass', password,
  '-keypass', password,
  '-alias', 'resharium',
  '-keyalg', 'RSA',
  '-keysize', '4096',
  '-validity', '10000',
  '-dname', 'CN=Resharium, O=Resharium, C=BY',
], { stdio: 'pipe', encoding: 'utf8' })

if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'keytool failed')

fs.writeFileSync(properties, [
  'storeFile=resharium-release.jks',
  `storePassword=${password}`,
  'keyAlias=resharium',
  `keyPassword=${password}`,
  '',
].join('\n'))

fs.mkdirSync(recoveryDirectory, { recursive: true })
fs.writeFileSync(recovery, [
  'Резервная копия подписи Android для Решариума',
  '',
  'Файл ключа: resharium-release.jks',
  'Псевдоним: resharium',
  `Пароль: ${password}`,
  '',
  'Храните этот файл и ключ в закрытом месте. Без них нельзя выпускать обновления поверх установленной версии.',
  'Никогда не загружайте ключ или пароль в публичный GitHub-репозиторий.',
  '',
].join('\n'))

console.log('Android release key created; credentials were not printed.')
