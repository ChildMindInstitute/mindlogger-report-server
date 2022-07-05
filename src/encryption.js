
import crypto from 'crypto';
import fs from 'fs';

const KEYS_FOLDER = process.env.KEYS_FOLDER;

const privateKeyFile = fs.readFileSync(`${KEYS_FOLDER}/private.pem`);
const privateKey = crypto.createPrivateKey({
  key: privateKeyFile,
  format: 'pem',
  type: 'pkcs1',
  passphrase: '',
  encoding: 'utf-8'
});

const publicKeyFile = fs.readFileSync(`${KEYS_FOLDER}/public`);
const publicKey = crypto.createPublicKey({
  key: publicKeyFile,
  format: 'pem',
  type: 'pkcs1',
  encoding: 'utf-8'
});

export const verifyPublicKey = (key) => {
  try {
    const publicKey = crypto.createPublicKey({ key, format: 'pem', type: 'pkcs1', encoding: 'utf-8' });
    const plain = crypto.privateDecrypt(privateKey, crypto.publicEncrypt(publicKey, 'pdf')).toString();

    return plain == 'pdf';
  } catch (e) {
  }

  return false;
}

export const encryptData = (data) => {
  return crypto.publicEncrypt(publicKey, JSON.stringify(data)).toString('base64');
}

export const decryptData = (response) => {
  const data = crypto.privateDecrypt(privateKey, Buffer.from(response, 'base64'))
  return JSON.parse(data);
}
