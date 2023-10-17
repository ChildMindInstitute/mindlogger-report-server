import sqlite3 from 'sqlite3'

const KEYS_FOLDER = process.env.KEYS_FOLDER || 'keys'
const PASSWORD_FILE = `${KEYS_FOLDER}/passwords`
let db: sqlite3.Database

const runQuery = (db: sqlite3.Database, query: string, args: any = undefined) =>
  new Promise((resolve, reject) => {
    db.run(query, args, (err: Error | null, rows: any[]) => {
      if (err) reject(err)
      resolve(rows)
    })
  })

const initDB = () =>
  new Promise<void>((resolve) => {
    const sqlite = sqlite3.verbose()
    db = new sqlite.Database(PASSWORD_FILE)

    db.serialize(() => {
      db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='pdf_keys';`, [], (err, row) => {
        if (row?.name) {
          resolve()
        } else {
          runQuery(db, `CREATE TABLE pdf_keys ( appletId VARCHAR(255), key VARCHAR(255), privateKey VARCHAR(255) )`)
            .then(() => runQuery(db, `CREATE INDEX APPLET_ID_INDEX ON pdf_keys (appletId)`))
            .then(() => resolve())
        }
      })
    })
  })

export const deleteAppletPassword = async (appletId: string, key: string) => {
  if (!db) await initDB()
  await runQuery(db, 'DELETE from pdf_keys where appletId=? and key=?', [appletId, key])
}

export const setAppletPassword = async (appletId: string, password: string, privateKey: string) => {
  if (!db) await initDB()

  const row = await getAppletPassword(appletId)

  if (row) {
    const stmt = db.prepare(`UPDATE pdf_keys SET key=?, privateKey=? WHERE appletId=?`)
    stmt.run(password, privateKey, appletId)
    stmt.finalize()
  } else {
    const stmt = db.prepare(`INSERT INTO pdf_keys VALUES (?, ?, ?)`)
    stmt.run(appletId, password, privateKey)
    stmt.finalize()
  }
}

export const getAppletPassword = (appletId: string): Promise<PdfKey | null> => {
  let preprocess = Promise.resolve()
  if (!db) preprocess = initDB()

  return preprocess.then(
    () =>
      new Promise((resolve) => {
        db.get(`SELECT * from pdf_keys where appletId=?`, [appletId], (err, row) => {
          if (err) resolve(null)
          resolve(row)
        })
      }),
  )
}

export interface PdfKey {
  appletId: string
  key: string
  privateKey: string
}

initDB()
