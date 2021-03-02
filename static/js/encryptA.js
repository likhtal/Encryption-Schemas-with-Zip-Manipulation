
function rot13(str) { 
    return str.split('').map(x => rot13.lookup[x] || x).join('')
}

rot13.input  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
rot13.output = 'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'.split('');
rot13.lookup = rot13.input.reduce((m,k,i) => Object.assign(m, {[k]: rot13.output[i]}), {});

async function digestMessageAsAb(message) {
  const encoder = new TextEncoder();
  const data = new Uint8Array(encoder.encode(message));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return hash;
}

async function digestMessageAsHex(message) {
  const encoder = new TextEncoder();
  const msgUint8 = new Uint8Array(encoder.encode(message));                     // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

async function decrypt(key, iv, encryptedAsAb) {
    return crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: iv, //The initialization vector you used to encrypt
        },
        key, //from generateKey or importKey above
        encryptedAsAb //ArrayBuffer of the data
    );
}

async function generateKeyAesCBC() {
    return crypto.subtle.generateKey(
        {
            name: "AES-CBC",
            length: 256, //can be  128, 192, or 256
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
}

async function exportKey(format, key) {
    return crypto.subtle.exportKey(
        format, //can be "jwk" or "raw"
        key //extractable must be true
    );
}

async function importKey(format, keyObject) {
    return crypto.subtle.importKey(
        format, //can be "jwk" or "raw"
        keyObject,
        {   //this is the algorithm options
            name: "AES-CBC",
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
}

async function encrypt(key, iv, dataAsAb) {
    return crypto.subtle.encrypt(
          {
              name: "AES-CBC",
              iv: iv,
          },
          key, 
          dataAsAb
    );
}

async function generateKeyPBKDF2(secret) {
    var encoder = new TextEncoder();
    var passphraseKey = new Uint8Array(encoder.encode(secret));

    // You should firstly import your passphrase Uint8array into a CryptoKey
    //return crypto.subtle.importKey(
    return crypto.subtle.importKey(
      'raw', 
      passphraseKey, 
      {name: 'PBKDF2'}, 
      false, // true
      ['deriveBits', 'deriveKey']
    );
}

async function generateKeyECDH() {
    return crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["deriveKey", "deriveBits"] //can be any combination of "deriveKey" and "deriveBits"
    );
}

async function deriveKey(keyPBKDF2, saltAsAb) {
    return crypto.subtle.deriveKey(
        {
            "name": "PBKDF2",
            salt: saltAsAb,  // crypto.getRandomValues(new Uint8Array(16))
            iterations: 1000,
            hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
        },
        keyPBKDF2, //your key from generateKey or importKey
        { //the key type you want to create based on the derived bits
            name: "AES-CBC", //can be any AES algorithm ("AES-CTR", "AES-CBC", "AES-CMAC", "AES-GCM", "AES-CFB", "AES-KW", "ECDH", "DH", or "HMAC")
            //the generateKey parameters for that type of algorithm
            length: 256, //can be  128, 192, or 256
        },
        true, //whether the derived key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //limited to the options in that algorithm's importKey
    );
}

async function deriveKeyECDH(keyECDH) {
    return crypto.subtle.deriveKey(
        {
            name: "ECDH",
            namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
            public: keyECDH.publicKey, //an ECDH public key from generateKey or importKey
        },
        keyECDH.privateKey, //your ECDH private key from generateKey or importKey
        { //the key type you want to create based on the derived bits
            name: "AES-CBC", //can be any AES algorithm ("AES-CTR", "AES-CBC", "AES-CMAC", "AES-GCM", "AES-CFB", "AES-KW", "ECDH", "DH", or "HMAC")
            //the generateKey parameters for that type of algorithm
            length: 256, //can be  128, 192, or 256
        },
        true, //whether the derived key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //limited to the options in that algorithm's importKey
    );
}

async function generateIvKey(r, user, fn) {
  let iv = new Uint8Array([47,28,226,107,181,219,38,58,118,181,139,61,227,13,96,202]);

  let keyPBKDF2 = await generateKeyPBKDF2(r + ';' + user);
  let key = await deriveKey(keyPBKDF2, str2ab(fn));

  return {iv, key};
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}
