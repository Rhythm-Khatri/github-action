const { Pool } = require("pg");
const { getSecret } = require("./config");
const { handleUpdateResult } = require("./utils");
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
    console.error("Error initializing database pool:", error.message || error);
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
    console.error(
      "Error connecting to the database client:",
      error.message || error
    );
    throw error;
  }
};

async function executeQuery(query, values) {
  const connection = await getDBConnection();
  try {
    const result = await connection.query(query, values);
    return result;
  } catch (error) {
    console.error("Error executing query:", error.message || error);
    throw error;
  } finally {
    connection.release();
  }
}

const checkForExistingRecord = async (appointmentGroupId, guestId) => {
  console.log("Checking for existing record in Database");
  const findQuery = `
    SELECT id, customer_status_type 
    FROM appointment_group 
    WHERE appointment_group_id = $1 AND guest_id = $2
  `;
  const values = [appointmentGroupId, guestId];
  const result = await executeQuery(findQuery, values);
  console.log("Found:", JSON.stringify(result.rows[0]));
  return result.rows;
};

const obtainDbUpdateStatus = async (updateStatus) => {
  console.log("Obtaining Zenoti Update status in Database");
  const findQuery = `
    SELECT id 
    FROM zenoti_appointment_status 
    WHERE zenoti_status_code = $1
  `;
  const values = [updateStatus];
  const result = await executeQuery(findQuery, values);
  return result.rows[0]?.id;
};

const insertRecord = async (appointment, dbUpdateStatusId) => {
  const client = await getDBConnection();

  try {
    await client.query("BEGIN");

    const isFT =
      process.env.ZENOTI_SERVICE_NEW_CLIENT_CONSULTATION_ID.split(",").includes(
        appointment.service_id ?? appointment.service.id
      ) || appointment.service?.category?.name === process.env.CATEGORY_NAME;

    if (isFT) {
      console.log("FT customer: It does not require insert. Exit.");
      await client.query("ROLLBACK");
      return;
    }

    const insertAppointmentGroupQuery = `
      INSERT INTO appointment_group 
      (customer_status_type, center_id, appointment_group_id, guest_id, provider_employee_id, zenoti_appointment_status_id) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const appointmentGroupValues = [
      1, // Customer_status_type
      appointment.center_id, // Center_id
      appointment.appointment_group_id, // Appointment_group_id
      appointment.guest.id, // Guest_id
      appointment.therapist.id, // provider_employee_id
      dbUpdateStatusId, // zenoti_appointment_status_id
    ];
    await client.query(insertAppointmentGroupQuery, appointmentGroupValues);

    const checkQuery = `
      SELECT id 
      FROM provider_detail 
      WHERE employee_id = $1 AND center_id = $2
    `;
    const providerExists = await client.query(checkQuery, [
      appointment.therapist.id, // employeeId
      appointment.center_id, // Center_id
    ]);

    if (providerExists.rows.length === 0) {
      console.log("Inserting provider");
      const insertProviderQuery = `
        INSERT INTO provider_detail 
        (employee_id, center_id, first_name, last_name) 
        VALUES ($1, $2, $3, $4)
      `;
      const providerValues = [
        appointment.therapist.id, // employeeId
        appointment.center_id, // Center_id
        appointment.therapist.first_name, // first_name
        appointment.therapist.last_name, // last_name
      ];
      await client.query(insertProviderQuery, providerValues);
    } else {
      console.log(
        `Provider with employee ID ${appointment.therapist.id} already exists. Skipping insert.`
      );
    }

    // Insert appointment
    console.log("Inserting appointment");
    const insertAppointmentQuery = `
      INSERT INTO appointment 
      (name, appointment_group_id, appointment_date, status, employee_id, appointment_type_id, appointment_id, service_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const appointmentValues = [
      appointment.service_name ?? appointment.service?.name, // name
      appointment.appointment_group_id, // appointment_group_id
      appointment.start_time_utc, // appointment_date
      "Needs Review", // status
      appointment.therapist.id, // employee_id
      1, // appointment_type_id
      appointment.appointment_id, // appointment_id
      appointment.service.id, // service_id
    ];
    await client.query(insertAppointmentQuery, appointmentValues);

    await client.query("COMMIT");
    console.log("All records inserted successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction failed, rolled back:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

const updateAppointmentStatus = async (
  appointmentGroupId,
  guestId,
  updateStatus
) => {
  const updateQuery = `
    UPDATE appointment_group 
    SET zenoti_appointment_status_id = $1 
    WHERE appointment_group_id = $2 AND guest_id = $3
  `;

  const values = [
    updateStatus, // zenoti_appointment_status
    appointmentGroupId, // Appointment_id
    guestId, // Guest_id
  ];
  const result = await executeQuery(updateQuery, values);
  handleUpdateResult(result);
};

module.exports = {
  getDBConnection,
  initializeDBPool,
  executeQuery,
  checkForExistingRecord,
  obtainDbUpdateStatus,
  insertRecord,
  updateAppointmentStatus,
};
