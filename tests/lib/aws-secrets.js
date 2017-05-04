const P = require('bluebird');
const chai = require('chai');
const nock = require('nock');
const simple = require('simple-mock');
const fs = P.promisifyAll(require('fs'));
const mockFs = require('mock-fs');
const AwsSecrets = require('../../lib/aws-secrets');

const should = chai.should();
const validSecretsObjectString = '{ "x": { "foo": "bar" } }';

describe('AwsSecrets', () => {
  afterEach(mockFs.restore);

  describe('constructor', () => {
    describe('with reasonable input', () => {
      it('creates an object', () => {
        const awsSecrets = new AwsSecrets('asdf');
        should.exist(awsSecrets);
        awsSecrets.KeyId.should.equal('asdf');
      });
    });
    describe('with specified region', () => {
      it('uses the provided region', () => {
        const awsSecrets = new AwsSecrets('asdf', { region: 'eu-west-1' });
        should.exist(awsSecrets);
        awsSecrets.KMS.config.region.should.equal('eu-west-1');
      })
    })
  });
  describe('#decryptFile', () => {
    describe('with encrypted data and no target', () => {
      it('returns the decrypted text', () => {
        const awsSecrets = new AwsSecrets('asdf', { region: 'eu-west-1' });
        simple.mock(awsSecrets.KMS, 'decrypt')
        .returnWith({ promise: () => P.resolve({ Plaintext: 'bar' }) });
        mockFs({
          fakefile: 'foo',
        });
        return awsSecrets.decryptFile('fakefile')
        .then((result) => {
          result.should.equal('bar');
        });
      });
    });
  });
  describe('#encryptFile', () => {
    describe('with normal data', () => {
      it('writes a file with the encrypted data', () => {
        const awsSecrets = new AwsSecrets('asdf', { region: 'eu-west-1' });
        simple.mock(awsSecrets.KMS, 'encrypt')
        .returnWith({ promise: () => P.resolve({ CiphertextBlob: 'bar' }) });
        mockFs({
          fakefile: 'foo',
        });
        return awsSecrets.encryptFile('fakefile', 'outfile')
        .then((result) => {
          fs.readFileAsync('outfile')
          .then((data) => {
            data.toString().should.equal('bar');
          });
        });
      });
    });
  });
  describe('#applySecrets', () => {
    describe('with valid secrets source', () => {
      it('applies the secrets to the target', () => {
        const awsSecrets = new AwsSecrets('asdf', { region: 'eu-west-1' });
        simple.mock(awsSecrets.KMS, 'decrypt')
        .returnWith({ promise: () => P.resolve({ Plaintext: validSecretsObjectString }) });
        const target = {
          x: 'secrets@x.foo',
        };
        return awsSecrets.applySecrets('asdf', target)
        .then((applied) => {
          applied.x.should.equal('bar');
        });
      });
    });
    describe('with empty secrets source', () => {
      it('returns the original target', () => {
        const awsSecrets = new AwsSecrets('asdf', { region: 'eu-west-1' });
        simple.mock(awsSecrets.KMS, 'decrypt')
        .returnWith({ promise: () => P.resolve({ Plaintext: '' }) });
        const target = {
          x: 'secrets@x.foo',
        };
        return awsSecrets.applySecrets('asdf', target)
        .then((applied) => {
          applied.should.deep.equal(target);
        });
      });
    });
    describe('with empty target', () => {
      it('returns the empty target', () => {
        const awsSecrets = new AwsSecrets('asdf', { region: 'eu-west-1' });
        simple.mock(awsSecrets.KMS, 'decrypt')
        .returnWith({ promise: () => P.resolve({ Plaintext: validSecretsObjectString }) });

        const target = {};
        return awsSecrets.applySecrets('asdf', target)
        .then((applied) => {
          applied.should.deep.equal(target);
        });
      });
    });
    describe('with target with no matches', () => {
      it('returns the original target', () => {
        const awsSecrets = new AwsSecrets('asdf', { region: 'eu-west-1' });
        simple.mock(awsSecrets.KMS, 'decrypt')
        .returnWith({ promise: () => P.resolve({ Plaintext: validSecretsObjectString }) });

        const target = {
          x: 'secrets@x.foos',
        };
        return awsSecrets.applySecrets('asdf', target)
        .then((applied) => {
          applied.should.deep.equal(target);
        });
      });
    });
  });
});
