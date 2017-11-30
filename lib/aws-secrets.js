const P = require('bluebird');
const fs = P.promisifyAll(require('fs'));
const AWS = require('aws-sdk');
const cloneDeepWith = require('lodash.clonedeepwith');
const isString = require('lodash.isstring');
const get = require('lodash.get');

class AwsSecrets {
  constructor(KeyId, config) {
    this.KeyId = KeyId;
    this.KMS = new AWS.KMS(config);
  }

  // Decrypts the input string, and returns it.
  decrypt(encryptedString) {
    const blob = new Buffer(encryptedString, 'base64');
    return this.KMS.decrypt({ CiphertextBlob: blob }).promise()
    .then(data => data.Plaintext.toString());
  }

  // Decrypt the file at the source filepath, and optionally, write it to the target filepath
  // Returns the decrypted contents.
  decryptFile(source, target) {
    return fs.readFileAsync(source)
    .then((data) => this.decrypt(data.toString()))
    .then((data) => {
      if (target) {
        return fs.writeFileAsync(target, data);
      }
      return data;
    });
  }

  // Encrypt the file at the source filepath and write to the target output filepath.
  encryptFile(source, target) {
    return fs.readFileAsync(source)
    .then(text => this.KMS.encrypt({ KeyId: this.KeyId, Plaintext: text }).promise())
    .then((data) => {
      return fs.writeFileAsync(target, data.CiphertextBlob.toString('base64'));
    });
  }

  // Applies encrypted secrets to the target object.
  applySecrets(encryptedSecrets, target, options) {
    const parseFunction = (options && options.parseFunction) || JSON.parse;
    const re = /^secrets@(.*)/;
    return this.decrypt(encryptedSecrets)
      .then((secrets) => {
        if (!secrets) { return target; }

        secrets = parseFunction(secrets);
        // replace all secrets references with their values
        const newObj = cloneDeepWith(target, (v) => {
          if (isString(v)) {
            const match = re.exec(v);
            if (match != null) {
              return get(secrets, match[1]);
            }
          }
          // returning undefined allows the default behavior to happen (copy)
          return undefined;
        });
        return newObj;
      });
  }
}

module.exports = AwsSecrets;
