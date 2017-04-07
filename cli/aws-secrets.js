const commandLineCommands = require('command-line-commands');
const commandLineArgs = require('command-line-args');
const AwsSecrets = require('../lib');

const validCommands = [null, 'encrypt-file', 'decrypt-file'];
const { command, argv } = commandLineCommands(validCommands);

const options = commandLineArgs([
  { name: 'key', alias: 'k', type: String },
]);

const crypto = new AwsSecrets(options.key);
switch (command.toLowerCase()) {
  case 'encrypt-file':
    crypto.encryptFile(argv[0], argv[1]);
    break;
  case 'decrypt-file':
    crypto.decryptFile(argv[0], argv[1]);
    break;
  default:
    break;
}
