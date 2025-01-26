import { getDBPool } from "./dbConnection.js";
import { getSecretValue } from "./secretManager.js";
import dotenv from "dotenv";
dotenv.config();

export const deleteAppointment = async (event, deleteStatus) => {
  console.log("deleteAppointment");
  const appointmentGroupId = event?.detail?.data?.appointment_group_id;
  console.log("appointmentGroupId", appointmentGroupId);
  console.time("secret_name");
  const secret_name = process.env.SECRET_NAME;
  console.timeEnd("secret_name");
  const secrets = await getSecretValue(secret_name);
  console.log("secrets", secrets);
  const pool = await getDBPool(secrets);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the AppointmentGroup
    const findAppointmentGroupQuery = `
      SELECT * FROM appointment_group WHERE appointment_group_id = $1
    `;
    const appointmentGroupResult = await client.query(
      findAppointmentGroupQuery,
      [appointmentGroupId]
    );
    if (appointmentGroupResult.rows.length === 0) {
      throw new Error(
        `AppointmentGroup with id ${appointmentGroupId} not found`
      );
    }
    const appointmentGroup = appointmentGroupResult.rows[0];

    // Find the "Deleted" ZenotiAppointmentStatus
    const findDeletedStatusQuery = `
      SELECT * FROM zenoti_appointment_status WHERE zenoti_status_code = $1
    `;
    const deletedStatusResult = await client.query(findDeletedStatusQuery, [
      deleteStatus,
    ]);

    if (deletedStatusResult.rows.length === 0) {
      throw new Error("Deleted status not found in ZenotiAppointmentStatus");
    }
    const deletedStatus = deletedStatusResult.rows[0];

    // Update the AppointmentGroup
    const oldStatusId = appointmentGroup.zenoti_appointment_status_id;
    const updateAppointmentGroupQuery = `
      UPDATE appointment_group 
      SET zenoti_appointment_status_id = $1 
      WHERE appointment_group_id = $2
    `;
    await client.query(updateAppointmentGroupQuery, [
      deletedStatus.id,
      appointmentGroupId,
    ]);

    // Create AppointmentHistory entry
    const insertHistoryQuery = `
      INSERT INTO appointment_history 
      (appointment_group_id, table_name, field, old_value, new_value, changed_at, changed_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await client.query(insertHistoryQuery, [
      appointmentGroupId,
      "appointment_group",
      "zenoti_appointment_status_id",
      oldStatusId.toString(),
      deletedStatus.id.toString(),
      new Date(),
      "ZENOTI", // Or pass in the user who triggered this change
    ]);

    // Commit the transaction
    await client.query("COMMIT");

    console.log(
      `Successfully updated AppointmentGroup ${appointmentGroupId} to Deleted status`
    );
  } catch (error) {
    // If there's an error, roll back the changes
    await client.query("ROLLBACK");
    console.error("Error updating appointment status:", error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
};
