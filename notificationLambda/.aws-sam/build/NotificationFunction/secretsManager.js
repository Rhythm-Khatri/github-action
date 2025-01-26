import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-west-2' }); // Replace with your AWS region
const secretsManager = new AWS.SecretsManager();

export async function getSecretValue(secretName) {

  try {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();

    if ('SecretString' in data) {
      return JSON.parse(data.SecretString);
    } else {
      let buff = Buffer.from(data.SecretBinary, 'base64');
      return buff.toString('ascii');
    }
  } catch (err) {
    console.error('Failed to retrieve secret', err);
    throw err;
  }
}
