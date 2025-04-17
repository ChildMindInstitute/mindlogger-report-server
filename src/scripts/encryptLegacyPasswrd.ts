import { logger } from '../core/services/LoggerService'
import { setAppletPassword, PdfKey, db } from '../db'

async function run() {
  if (!process.env.AWS_KMS_KEY_ID) {
    logger.warn('AWS_KMS_KEY_ID is not set, skipping encryption')
    return
  }

  db.all(`SELECT * FROM pdf_keys WHERE key NOT LIKE 'ENC_%'`, [], (err, rows: PdfKey[]) => {
    if (err) {
      logger.error('Error: ', err)
      return
    }

    for (const row of rows) {
      if (row.key && row.key.length > 0 && !row.key.startsWith('ENC_')) {
        logger.info('Encrypting password for appletId:', row.appletId)
        setAppletPassword(row.appletId, row.key, row.privateKey)
      }
    }
  })
}

run().catch((err) => logger.error(err))
