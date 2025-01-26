const zenoti_secrets = process.env.ZENOTI_SECRETS;
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const getSecret = async (secretName) => {
  const client = new SecretsManagerClient({ region: "us-west-2" });
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretName,
      VersionStage: "AWSCURRENT",
    })
  );
  return response.SecretString;
};

const getZenotiSecretValue = async () => {
  const secret = await getSecret(zenoti_secrets);
  const secretJson = JSON.parse(secret);
  return secretJson;
};

module.exports = {
  getSecret,
  getZenotiSecretValue
}