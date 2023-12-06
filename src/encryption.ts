// @ts-nocheck
import 'dotenv/config'
import crypto from 'crypto'
import fs from 'fs'
import { logger } from './core/helpers'

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
    const plain = crypto.privateDecrypt(privateKey, crypto.publicEncrypt(publicKey, 'pdf')).toString()

    return plain == 'pdf'
  } catch (e) {}

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

  return parsedJSON
}
