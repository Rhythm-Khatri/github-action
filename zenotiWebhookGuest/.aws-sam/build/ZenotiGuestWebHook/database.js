const { Pool } = require("pg");
const { getSecret } = require("./config");
const dbSecret = process.env.SECRET_NAME;

let pool;

const initializeDBPool = async () => {
  if (pool) return; 
  try {
    const secret = await getSecret(dbSecret);
    const secretJson = JSON.parse(secret);

    pool = new Pool({
      host: secretJson.DB_HOST,
      port: secretJson.DB_PORT,
      user: secretJson.DB_USER,
      password: secretJson.DB_PASSWORD,
      database: secretJson.DB_NAME,
    });

    console.log("Database pool initialized successfully");
  } catch (error) {
    console.error("Error initializing database pool:", error);
    throw error;
  }
};

const getDBConnection = async () => {
  if (!pool) {
    await initializeDBPool();
  }

  try {
    const client = await pool.connect();
    console.log("Database client connected successfully");
    return client;
  } catch (error) {
    console.error("Error connecting to the database client:", error);
    throw error;
  }
};

module.exports = {
  getDBConnection,
  initializeDBPool,
};
