#!/usr/bin/env node
const commandLineCommands = require('command-line-commands');
const commandLineArgs = require('command-line-args');
const AwsSecrets = require('../lib/aws-secrets');

const validCommands = [null, 'encrypt-file', 'decrypt-file'];
const { command, argv } = commandLineCommands(validCommands);

const options = commandLineArgs([
  { name: 'key', alias: 'k', type: String },
  { name: 'region', alias: 'r', type: String },
]);

let awsSecrets;
if (options.region){
  awsSecrets = new AwsSecrets(options.key, { region: options.region });
} else {
  awsSecrets = new AwsSecrets(options.key);
}
switch (command.toLowerCase()) {
  case 'encrypt-file':
    awsSecrets.encryptFile(argv[0], argv[1]);
    break;
  case 'decrypt-file':
    awsSecrets.decryptFile(argv[0], argv[1]);
    break;
  default:
    break;
}
