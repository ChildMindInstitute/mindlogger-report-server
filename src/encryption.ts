import crypto from 'crypto'
import fs from 'fs'

const KEYS_FOLDER = process.env.KEYS_FOLDER || 'keys'

const getPrivateKey = () => {
  const file = fs.readFileSync(`${KEYS_FOLDER}/private.pem`)
  // @ts-ignore
  const privateKey = crypto.createPrivateKey({
    key: file,
    format: 'pem',
    type: 'pkcs1',
    passphrase: '',
    encoding: 'utf-8',
  })

  return privateKey
}

const getPublicKey = () => {
  const file = fs.readFileSync(`${KEYS_FOLDER}/public`)
  // @ts-ignore
  const publicKey = crypto.createPublicKey({ key: file, format: 'pem', type: 'pkcs1', encoding: 'utf-8' })

  return publicKey
}

export const verifyPublicKey = (key: any) => {
  try {
    // @ts-ignore
    const publicKey = crypto.createPublicKey({ key, format: 'pem', type: 'pkcs1', encoding: 'utf-8' })
    const privateKey = getPrivateKey()
    // @ts-ignore
    const plain = crypto.privateDecrypt(privateKey, crypto.publicEncrypt(publicKey, 'pdf')).toString()

    return plain == 'pdf'
  } catch (e) {}

  return false
}

export const decryptData = (response: string | string[]): any => {
  const privateKey = getPrivateKey()
  let data = ''
  if (Array.isArray(response)) {
    for (let i = 0; i < response.length; i++) {
      data += crypto.privateDecrypt(privateKey, Buffer.from(response[i], 'base64'))
    }
  } else {
    // @ts-ignore
    data = crypto.privateDecrypt(privateKey, Buffer.from(response, 'base64'))
  }
  return JSON.parse(data)
}
