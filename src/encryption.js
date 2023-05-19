
import crypto from 'crypto';
import fs from 'fs';

const KEYS_FOLDER = process.env.KEYS_FOLDER || 'keys';

const getPrivateKey = () => {
  const file = fs.readFileSync(`${KEYS_FOLDER}/private.pem`);
  const privateKey = crypto.createPrivateKey({
    key: file,
    format: 'pem',
    type: 'pkcs1',
    passphrase: '',
    encoding: 'utf-8'
  });

  return privateKey;
}

const getPublicKey = () => {
  const file = fs.readFileSync(`${KEYS_FOLDER}/public`);
  const publicKey = crypto.createPublicKey({
    key: file,
    format: 'pem',
    type: 'pkcs1',
    encoding: 'utf-8'
  });

  return publicKey;
}

export const verifyPublicKey = (key) => {
  try {
    const publicKey = crypto.createPublicKey({ key, format: 'pem', type: 'pkcs1', encoding: 'utf-8' });
    const privateKey = getPrivateKey();
    const plain = crypto.privateDecrypt(privateKey, crypto.publicEncrypt(publicKey, 'pdf')).toString();

    return plain == 'pdf';
  } catch (e) {
  }

  return false;
}

export const encryptData = (data) => {
  const publicKey = getPublicKey();
  return crypto.publicEncrypt(publicKey, JSON.stringify(data)).toString('base64');
}

export const decryptData = (response) => {
  const privateKey = getPrivateKey();
  let data = '';
  if (Array.isArray(response)) {
    for (let i = 0; i < response.length; i++) {
      data += crypto.privateDecrypt(privateKey, Buffer.from(response[i], 'base64'));
    }
  } else {
    data = crypto.privateDecrypt(privateKey, Buffer.from(response, 'base64'));
  }
  return JSON.parse(data);
}

export const verifyAppletPassword = (appletPrivate, encryption) => {
  if (!encryption || !encryption.prime || !encryption.publicKey) return false;

  const key = crypto.createDiffieHellman(
    Buffer.from(encryption.prime),
    Buffer.from(encryption.base)
  );

  key.setPrivateKey(Buffer.from(appletPrivate));
  key.generateKeys();

  if (
    key.getPublicKey().equals(Buffer.from(encryption.publicKey))
  ) {
    return true;
  }

  return false;
}
