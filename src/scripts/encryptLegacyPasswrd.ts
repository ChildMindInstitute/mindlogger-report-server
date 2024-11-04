import { setAppletPassword, PdfKey, db } from '../db'

async function run() {
  db.all(`SELECT * from pdf_keys`, [], (err, rows: PdfKey[]) => {
    if (err) {
      console.log('Error: ', err)
      return
    }

    for (const row of rows) {
      if (row.key && row.key.length > 0 && !row.key.startsWith('ENC_')) {
        setAppletPassword(row.appletId, row.key, row.privateKey)
      }
    }
  })
}

run().catch(console.dir)
