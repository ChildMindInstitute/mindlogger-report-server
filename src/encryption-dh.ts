import crypto from 'crypto'
import { IAppletEncryption, ItemResponse } from './core/interfaces'

export function decryptResponses(
  responses: string,
  appletPrivateKey: string,
  encryption: IAppletEncryption,
  userPublicKey: string,
): ItemResponse[] {
  const AESKey = getAESKey(
    appletPrivateKey,
    JSON.parse(userPublicKey) as number[],
    JSON.parse(encryption.prime) as number[],
    JSON.parse(encryption.base) as number[],
  )
  return JSON.parse(decryptData(responses, AESKey)) as ItemResponse[]
}

function decryptData(text: string, key: Buffer): string {
  const textParts: string[] = text.split(':')
  // @ts-ignore
  const iv = Buffer.from(textParts.shift(), 'hex')
  const encryptedText = Buffer.from(textParts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
  const decrypted = decipher.update(encryptedText)

  try {
    return decrypted.toString() + decipher.final('utf8')
  } catch (error) {
    console.error('Decrypt data failed. Text:', text, 'key:', key, 'error:', error)
    return JSON.stringify([{ type: '', time: '', screen: '' }])
  }
}

function getAESKey(appletPrivateKey: string, userPublicKey: number[], appletPrime: number[], base: number[]): Buffer {
  const key = crypto.createDiffieHellman(Buffer.from(appletPrime), Buffer.from(base))
  key.setPrivateKey(Buffer.from(appletPrivateKey))

  const secretKey = key.computeSecret(Buffer.from(userPublicKey))

  return crypto.createHash('sha256').update(secretKey).digest()
}
