import 'dotenv/config'
import crypto from 'crypto'
import fs from 'fs'
import { logger } from './core/services/LoggerService'
import tracer from './tracer'

const KEYS_FOLDER = process.env.KEYS_FOLDER || 'keys'

const getPrivateKey = () => {
  const file = fs.readFileSync(`${KEYS_FOLDER}/private.pem`)
  const privateKey = crypto.createPrivateKey({
    key: file,
    format: 'pem',
    type: 'pkcs1',
    passphrase: '',
    encoding: 'utf-8',
  })

  return privateKey
}

export const verifyPublicKey = (key: string): boolean => {
  try {
    const publicKey = crypto.createPublicKey({ key, format: 'pem', type: 'pkcs1', encoding: 'utf-8' })
    const privateKey = getPrivateKey()

    const plain = crypto.privateDecrypt(privateKey, crypto.publicEncrypt(publicKey, Buffer.from('pdf'))).toString()

    return plain == 'pdf'
  } catch {}

  return false
}

export const decryptData = <T>(response: string | string[]): T => {
  const T0 = performance.now()

  const privateKey = getPrivateKey()
  const dataArray = []
  if (Array.isArray(response)) {
    for (let i = 0; i < response.length; i++) {
      dataArray.push(crypto.privateDecrypt(privateKey, Buffer.from(response[i], 'base64')))
    }
  } else {
    dataArray.push(crypto.privateDecrypt(privateKey, Buffer.from(response, 'base64')))
  }

  const data = dataArray.join('')
  const parsedJSON = JSON.parse(data)

  const T1 = performance.now()

  logger.info(`Decryption took ${T1 - T0} milliseconds.`)
  tracer.dogstatsd.gauge('report_server.decryption.duration', T1 - T0)

  return parsedJSON
}
