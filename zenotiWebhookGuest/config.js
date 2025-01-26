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

const getServiceAccount = async () => {
  const liftoffSecrets = await getSecret(process.env.LIFTOFF_SECRETS);
  const parsedSecrets = JSON.parse(liftoffSecrets);
  return {
    type: parsedSecrets.FIREBASE_TYPE,
    project_id: parsedSecrets.FIREBASE_PROJECT_ID,
    private_key_id: parsedSecrets.FIREBASE_PRIVATE_KEY_ID,
    private_key: parsedSecrets.FIREBASE_PRIVATE_KEY,
    client_email: parsedSecrets.FIREBASE_CLIENT_EMAIL,
    client_id: parsedSecrets.FIREBASE_CLIENT_ID,
    auth_uri: parsedSecrets.FIREBASE_AUTH_URI,
    token_uri: parsedSecrets.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: parsedSecrets.FIREBASE_AUTH_CERT_URL,
    client_x509_cert_url: parsedSecrets.FIREBASE_CLIENT_CERT_URL,
    universe_domain: parsedSecrets.FIREBASE_DOMAIN,
  };
};

module.exports = {
  getSecret,
  getServiceAccount,
};
