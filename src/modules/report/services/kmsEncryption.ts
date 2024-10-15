import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms'
import { logger } from '../../../core/services/LoggerService'

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

const kmsKeyId = process.env.AWS_KMS_KEY_ID

const DATA_PREFIX = 'ENC_'

export async function encryptData(data: string): Promise<string> {
  if (!kmsKeyId) {
    return data
  }

  const params = {
    KeyId: kmsKeyId,
    Plaintext: Buffer.from(data),
  }

  try {
    const command = new EncryptCommand(params)
    const data = await kmsClient.send(command)
    if (data.CiphertextBlob) {
      return `${DATA_PREFIX}${Buffer.from(data.CiphertextBlob).toString('base64')}`
    } else {
      throw new Error('Encryption failed, no CiphertextBlob found.')
    }
  } catch (error) {
    logger.error('Encryption error:', error)
    throw error
  }
}

export async function decryptData(encryptedData: string): Promise<string> {
  if (!encryptedData.startsWith(DATA_PREFIX) || !kmsKeyId) {
    return encryptedData
  }

  const params = {
    CiphertextBlob: Buffer.from(encryptedData.replace(DATA_PREFIX, ''), 'base64'),
  }

  try {
    const command = new DecryptCommand(params)
    const data = await kmsClient.send(command)
    if (data.Plaintext) {
      return Buffer.from(data.Plaintext).toString()
    } else {
      throw new Error('Decryption failed, no Plaintext found.')
    }
  } catch (error) {
    logger.error('Decryption error:', error)
    throw error
  }
}
