const AwsSecrets = require('aws-secrets');
const P = require('bluebird');
const config = require('./config');
const readFile = P.promisify(require('fs').readFile);

readFile('./secrets.txt', {encoding: 'utf-8'})
  .then(secrets => {
    // decrypt and apply secrets to the config object
    return new AwsSecrets().applySecrets(secrets, config);
  })
  .then(fullConfig => console.log(JSON.stringify(fullConfig)));
