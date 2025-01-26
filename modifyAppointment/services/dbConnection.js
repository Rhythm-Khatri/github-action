import pkg from 'pg';
const { Pool } = pkg;

let pool;

export const getDBPool = async (secret) => {
  if (pool) return pool;

  pool = new Pool({
    host: secret.DB_HOST,
    port: secret.DB_PORT,
    user: secret.DB_USER,
    password: secret.DB_PASSWORD,
    database: secret.DB_NAME,
    max: 5 
  });

  // Test the connection
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the PostgreSQL database ?!?!!!!');
    client.release();
  } catch (err) {
    console.error('Error connecting to the database', err);
  }

  return pool;
};