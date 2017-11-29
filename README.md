![Build Status](https://travis-ci.org/Cimpress-MCP/aws-secrets.svg?branch=master)

# aws-secrets

With aws-secrets you can safely store, version, and use secrets by leveraging AWS Key Managment Store.

1. You put your secrets in a JSON file (other formats like YAML are fine too but require a parser to be supplied to the application).
1. Use the CLI to encrypt that file
1. Include the encrypted data in your source repository alongside your source code. You only need to decrypt that file back to disk when you need to make changes.
1. At runtime, use aws-secrets to access your unencrypted secrets without writing them to the filesystem.

Only AWS users with access to your Key Management Store master key will be able to access the unencrypted secrets.

## Installation
```Bash
npm install aws-secrets --save
```

## Prerequisites to Using
Before you can use the module, you need to have set in place several things:
1. Install [the AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and [configure it](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) so that you can access your AWS account. Running `aws s3 ls` is a reasonable way to verify it is properly configured, assuming you are authorized to perform that operation.

    * Set the AWS\_REGION environment variable if using the AWS CLI

2. [Create a master key](http://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html) in the AWS Key Management Service. Keys are region-specific, so be sure you create the key in the same region you intend to encrypt and decrypt secrets. Note that you cannot use the keys created automatically by AWS for securing services. Copy the ARN or the id of the key, which you will need later. To view your keys, find them in IAM under the section titled *Encryption keys.*

## Usage

### Creating Secrets
Using this module involves both the command line and code:
1. Put your secrets in a JSON file--say `.secrets.json`. For example:
```JSON
{
      "github": {
          "username": "stevie",
          "password": "albertistheman"
      },
      "foo": {
          "bar": {
              "key": "qwerty"
          }
      }
};
```
2. Add encrypt and decrypt scripts to your package.json scripts section:
```JSON
"encrypt": "aws-secrets encrypt-file .secrets.json secrets.txt -k $npm_package_kmsKey && rm .secrets.json",
"decrypt": "aws-secrets decrypt-file secrets.txt .secrets.json"
```
3. Put the ARN of your encryption key in package.json:
```
"kmsKey": "<YOUR KEY HERE>"
```
4. Encrypt the secrets file using the cli:

  ```Bash
    npm run encrypt
  ```

5. Include the encrypted file (secrets.json in this example) in your source control project as a versioned file. For example:

  ```Bash
  git add secrets.json
  ```

6. Ignore the unencrypted file so that you do not accidentally add and commit it to your repo. If you are using git, this means adding .secrets.js to the `.gitignore` file.

7. Put your non-sensitive configuration into an object. For sensitive data, refer to the object path in the secrets object, preceded by 'secrets@':

  ```Javascript
  // config.js
  module.exports = {
    githubEndpoint: {
      uri: 'https://www.github.com',
      username: 'secrets@github.username',
      password: 'secrets@github.password'
    }
    foobarkey: 'secrets@foo.bar.key'
  }
  ```

### Accessing the Secrets at Runtime

Use the AwsSecrets object to decrypt and apply the secrets to your configuration object:
```Javascript
const AwsSecrets = require('aws-secrets');
const config = require('./config');
const P = require('bluebird');
const fs = P.promisifyAll(require('fs'));
...
  const awsSecrets = new AwsSecrets()

  return fs.readFileAsync('secrets.json')
  .then(secrets => {
    return awsSecrets.applySecrets(secrets, config);
  })
...
```

If you aren't using JSON, you can supply your own parser function as an option:
```Javascript
const yaml = require('js-yaml');
...
  return fs.readFileAsync('secrets.yaml')
  .then(secrets => {
    return awsSecrets.applySecrets(secrets, config, { parseFunction: yaml.safeLoad });
  })
```

  The return value has this value:

  ```Javascript
  // config.js
  module.exports = {
    githubEndpoint: {
      uri: 'https://www.github.com',
      username: 'stevie',
      password: 'albert-is-the-man'
    },
    foobarkey: 'qwerty'
  }
  ```

### Making Changes to Secrets
The only time you need to decrypt the secrets and save to a file is when you need to change them. To do that, use the command line:

```Bash
npm decrypt-file secrets.json .secrets.json
```

`.secrets.json` will now contain the unencrypted version of your secrets. Make your changes and then run the `encrypt-file` command as you did when you initially created the secrets.

### Examples
See the [example project](./examples/password/) for a concrete usage example.

##  Details
Secrets are encrypted and stored in base64 format. At runtime, this file is decrypted in memory and referenced by the configuration values.

Encryption keys are managed by AWS Key Management Store and all authentication/authorization happens through that. As a consequence, any operation requiring encryption or decryption (i.e., runtime, developer edits) will require you to provide credentials to access the AWS KMS master key.

Note that KMS keys can only be used to encrypt up to 4KiB of data. If your config file is longer than that, you will need to use envelope encryption, which is not currently supported by aws-secrets.

## Development
We are using [semantic-release](https://github.com/semantic-release/semantic-release) with [AngularJS Git Commit Message conventions](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit). Please ensure you use that commit message format so that publishing happens as needed. We recommend using [commitizen](https://github.com/commitizen/cz-cli) for that.
