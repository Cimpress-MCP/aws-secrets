![Build Status](https://travis-ci.org/Cimpress-MCP/aws-secrets.svg?branch=master)

# aws-secrets

With aws-secrets you can safely store, version, and use secrets by leveraging AWS Key Managment Store.

1. You put your secrets in a Javascript object.
1. Use the CLI to encrypt that file
1. Include the encrypted data in your source repository alongside your source code. You only need to decrypt that file back to disk when you need to make changes.
1. At runtime, use aws-secrets to access your unencrypted secrets without writing them to the filesystem.

Only AWS users with access to your Key Management Store master key will be able to access the unencrypted secrets.

## Installation
`npm install aws-secrets --save`, or

`yarn add aws-secrets`

## Prerequisites to Using
Before you can use the module, you need to have set in place several things:
1. Install [the AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and [configure it](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) so that you can access your AWS account. Running `aws s3 ls` is a reasonable way to do this, assuming you are authorized to perform that operation.
2. [Create a master key](http://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html) in the AWS Key Management Service. Keys are region-specific, so be sure you create the key in the same region you intend to encrypt and decrypt secrets. Note that you cannot use the keys created automatically by AWS for securing services. Copy the ARN or the id of the key, which you will need later. To view your keys, find them in IAM under the section titled *Encryption keys.*

## Usage

### Creating Secrets
Using this module involves both the command line and code:
1. Put your secrets in a plaintext Javascript file--say `.secrets.js`--that exports a single object. Use any form you like. For example:
~~~~
module.exports = {
  github: {
    username: 'stevie',
    password: 'albertistheman',
  },
  foo: {
    bar: {
      key: 'qwerty'
    }
  }
};
~~~~
2. Encrypt the secrets file using the cli:

  `node_modules/.bin/aws-secrets encrypt-file .secrets.js secrets.js --key [your master key id, ARN, or alias]`

3. Include the encrypted file (secrets.js in this example) in your source control project as a versioned file. For example:

  `git add secrets.js`

4. [Optional] Ignore the unencrypted file so that you do not accidentally add and commit it to your repo. If you are using git, this means adding .secrets.js to the `.gitignore` file.

5. Put your non-sensitive configuration into an object. For sensitive data, refer to the object path in the secrets object, preceded by 'secrets@':

  ~~~
  // config.js
  module.exports = {
    githubEndpoint: {
      uri: 'https://www.github.com',
      username: 'secrets@github.username',
      password: 'secrets@github.password'
    }
    foobarkey: 'secrets@foo.bar.key'
  }
  ~~~

### Accessing the Secrets at Runtime

Use the AwsSecrets object to decrypt and apply the secrets to config.js:
~~~
const AwsSecrets = require('aws-secrets');
const config = require('./config');
...
  const awsSecrets = new AwsSecrets([your master key id, arn, or alias])
  const newConfig = awsSecrets.applySecrets('secrets.js', config);
...
~~~

  newConfig (in memory) now has this value:

  ~~~
  // config.js
  module.exports = {
    githubEndpoint: {
      uri: 'https://www.github.com',
      username: 'stevie',
      password: 'albertistheman'
    },
    foobarkey: 'qwerty'
  }
  ~~~

### Making Changes to Secrets
The only time you need to decrypt the secrets and save to a file is when you need to change them. To do that, use the command line:

`node_modules/.bin/aws-secrets decrypt-file secrets.js .secrets.js`

`.secrets.js` will now contain the unencrypted verision of your secrets. Make your changes and then run the `encrypt-file` command as you did when you initially created the secrets.

##  Details
Secrets are encrypted and stored in base64 format. At runtime, this file is decrypted in memory and referenced by the configuration values.

Encryption keys are managed by AWS Key Management Store and all authentication/authorization happens through that. As a consequence, any operation requiring encryption or decryption (i.e., runtime, developer edits) will require you to provide credentials to access the AWS KMS master key.

Note that KMS keys can only be used to encrypt up to 4KiB of data. If your config file is longer than that, you will need to use envelope encryption, which is not currently supported by aws-secrets.
