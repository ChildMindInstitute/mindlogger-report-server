import sqlite3 from 'sqlite3';

const PASSWORD_FILE = `${process.env.KEYS_FOLDER}/passwords`;
let db = null;

const runQuery = (db, query, args) => new Promise((resolve, reject) => {
  db.run(query, args, (err, rows) => {
    if (err) reject(err);
    resolve(rows);
  })
})

const initDB = () => new Promise(resolve => {
  const sqlite = sqlite3.verbose();
  db = new sqlite.Database(PASSWORD_FILE);

  db.serialize(() => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='pdf_keys';`, [], (err, row) => {
      if (row?.name) {
        resolve();
      } else {
        runQuery(db, `CREATE TABLE pdf_keys ( serverId VARCHAR(255), key VARCHAR(255) )`)
          .then(() => runQuery(db, `CREATE INDEX SERVER_ID_INDEX ON pdf_keys (serverId)`))
          .then(() => resolve())
      }
    })
  })
})

export const setAppletPassword = async (serverId, password) => {
  if (!db) await initDB();

  if (await getAppletPassword(serverId)) {
    const stmt = db.prepare(`UPDATE pdf_keys SET key=? WHERE serverId=?`);
    stmt.run(password, serverId);
    stmt.finalize();
  } else {
    const stmt = db.prepare(`INSERT INTO pdf_keys VALUES (?, ?)`);
    stmt.run(serverId, password);
    stmt.finalize();
  }
}

export const getAppletPassword = (serverId) => {
  let preprocess = Promise.resolve();
  if (!db) preprocess = initDB();

  return preprocess.then(() => new Promise(resolve => {
    db.get(`SELECT key from pdf_keys where serverId=?`, [serverId], (err, row) => {
      if (err) resolve(null);
      resolve(row?.key);
    })
  }))
}

initDB();
