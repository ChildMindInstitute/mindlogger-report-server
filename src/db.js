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
        runQuery(db, `CREATE TABLE pdf_keys ( serverId VARCHAR(255), key VARCHAR(255), privateKey VARCHAR(255), appletId VARCHAR(255), verified TINYINT, accountId VARCHAR(255) )`)
          .then(() => runQuery(db, `CREATE INDEX SERVER_ID_INDEX ON pdf_keys (serverId)`))
          .then(() => resolve())
      }
    })
  })
})

export const deleteAppletPassword = async (serverId, key) => {
  if (!db) await initDB();
  await runQuery(db, 'DELETE from pdf_keys where serverId=? and key=?', [serverId, key]);
}

export const setPasswordVerified = async (serverId, key, appletId) => {
  if (!db) await initDB();
  await runQuery(db, 'UPDATE pdf_keys set verified=1, appletId=? where serverId=? and key=?', [appletId, serverId, key]);
}

export const setAppletPassword = async (serverId, password, privateKey, appletId, accountId) => {
  if (!db) await initDB();

  const row = await getAppletPassword(serverId)

  if (row && row.verified) {
    if (!row.appletId && row.appletId != appletId || row.accountId != accountId) {
      throw new Error('permission denied');
    }

    return ;
  }

  if (row && !row.verified && (!row.appletId || appletId)) {
    const stmt = db.prepare(`UPDATE pdf_keys SET key=?, privateKey=?, appletId=?, accountId=? WHERE serverId=?`);
    stmt.run(password, privateKey, appletId, accountId, serverId);
    stmt.finalize();
  } else {
    const stmt = db.prepare(`INSERT INTO pdf_keys VALUES (?, ?, ?, ?, false, ?)`);
    stmt.run(serverId, password, privateKey, appletId, accountId);
    stmt.finalize();
  }
}

export const getAppletPassword = (serverId) => {
  let preprocess = Promise.resolve();
  if (!db) preprocess = initDB();

  return preprocess.then(() => new Promise(resolve => {
    db.get(`SELECT * from pdf_keys where serverId=?`, [serverId], (err, row) => {
      if (err) resolve(null);
      resolve(row);
    })
  }))
}

initDB();
