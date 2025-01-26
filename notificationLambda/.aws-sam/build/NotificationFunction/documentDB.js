import mongoose from 'mongoose';
import path from 'path';
let cachedDb = null;

export async function getDocumentDbConnection(secret) {
  if (cachedDb) {
    return cachedDb;
  }


  const tlsCAFile = `tls/dev/us-west-2-bundle.pem`;

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tlsCAFile: path.resolve('.', tlsCAFile),  // Attach the certificate
  };

  try {
    // console.log('Connecting to DocumentDB',   secret);
    // console.time("mongoose.Connet");
    const DB_CONNECTION_STRING = secret.DB_CONNECTION_STRING;

    await mongoose.connect(DB_CONNECTION_STRING, options);
    // console.timeEnd("mongoose.Connet");
    cachedDb = mongoose.connection;
    return cachedDb;
  } catch (error) {
    console.error('Error connecting to DocumentDB', error);
    throw new Error('Could not connect to DocumentDB');
  }
}
