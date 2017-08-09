/* eslint no-underscore-dangle: "off"*/
const P = require('bluebird');
const fs = P.promisifyAll(require('fs'));
const AWS = require('aws-sdk');
const _ = require('lodash');

class AwsSecrets {
  constructor(KeyId, config) {
    this.KeyId = KeyId;
    this.KMS = new AWS.KMS(config);
  }

  decryptFile(source, target) {
    return fs.readFileAsync(source)
    .then((data) => {
      const blob = new Buffer(data.toString(), 'base64');
      return this.KMS.decrypt({ CiphertextBlob: blob }).promise();
    })
    .then((data) => {
      if (target) {
        return fs.writeFileAsync(target, data.Plaintext.toString());
      }
      return data.Plaintext.toString();
    });
  }

  encryptFile(source, target) {
    return fs.readFileAsync(source)
    .then(text => this.KMS.encrypt({ KeyId: this.KeyId, Plaintext: text }).promise())
    .then((data) => {
      return fs.writeFileAsync(target, data.CiphertextBlob.toString('base64'));
    });
  }

  decrypt(encryptedString) {
    const blob = new Buffer(encryptedString, 'base64');
    return this.KMS.decrypt({ CiphertextBlob: blob }).promise()
    .then(data => data.Plaintext.toString());
  }

  applySecrets(encryptedSecrets, target, options) {
    const parseFunction = (options && options.parseFunction) || JSON.parse;
    const re = /^secrets@(.*)/;
    return this.decrypt(encryptedSecrets)
    .then((secrets) => {
      if (!secrets) { return target; }

      secrets = parseFunction(secrets);
      // replace all secrets references with their values
      const newObj = _.cloneDeepWith(target, (v) => {
        if (_.isString(v)) {
          const match = re.exec(v);
          if (match != null) {
            return _.get(secrets, match[1]);
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
