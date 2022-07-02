
import crypto from 'crypto';
import fs from 'fs';

const privateKeyFile = fs.readFileSync('keys/private.pem');
const privateKey = crypto.createPrivateKey({
  key: privateKeyFile,
  format: 'pem',
  type: 'pkcs1',
  passphrase: '',
  encoding: 'utf-8'
});

const publicKeyFile = fs.readFileSync('keys/public');
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


//generate encrypted privateKey
// const {publicKey, privateKey } = crypto.generateKeyPairSync('rsa',
//   {
//     modulusLength: 4096,
//     publicKeyEncoding: {
//     type: 'spki',
//     format: 'pem'
//   },
//   privateKeyEncoding: {
//     type: 'pkcs8',
//     format: 'pem',
//     cipher: 'aes-256-cbc',
//     passphrase: ''
//   }
// });

// //generate key Object
// const publickey = crypto.createPublicKey({
//     key: publicKey,
//     format: "pem",
//     type: "pkcs1",
//     encoding: "utf-8"
// });

// const privatekey = crypto.createPrivateKey({
//     key: privateKey,
//     format: "pem",
//     type: "pkcs1",
//     passphrase: "",
//     encoding: "utf-8"
// });
