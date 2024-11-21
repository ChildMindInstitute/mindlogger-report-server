import { setAppletPassword, PdfKey, db } from '../db'

async function run() {
  if (!process.env.AWS_KMS_KEY_ID) {
    console.warn('AWS_KMS_KEY_ID is not set, skipping encryption')
    return
  }

  db.all(`SELECT * FROM pdf_keys WHERE key NOT LIKE 'ENC_%'`, [], (err, rows: PdfKey[]) => {
    if (err) {
      console.log('Error: ', err)
      return
    }

    for (const row of rows) {
      if (row.key && row.key.length > 0 && !row.key.startsWith('ENC_')) {
        console.log('Encrypting password for appletId:', row.appletId)
        setAppletPassword(row.appletId, row.key, row.privateKey)
      }
    }
  })
}

run().catch(console.dir)
