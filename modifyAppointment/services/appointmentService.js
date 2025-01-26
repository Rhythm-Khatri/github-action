import { getDBPool } from "./dbConnection.js";
import { getSecretValue } from "./secretManager.js";
import dotenv from "dotenv";
dotenv.config();

export const modifyAppointment = async (event, appointmentList, appointment_group_id) => {
  const guestId = event?.detail?.data?.guest?.id;
  if (!guestId) {
    console.error(`ERROR: No guestId received`);
    throw new Error("No guestId received");
  }

  const secret_name = process.env.SECRET_NAME;
  const secrets = await getSecretValue(secret_name);
  const pool = await getDBPool(secrets); 
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');

    for (const appointment of appointmentList) {
      if(appointment.is_add_on===true){
        continue;
      }
      let appointmentTypeId = 1; // treatment appt
      const findQuery =
        "SELECT service_id FROM service_tag_configuration WHERE service_id = $1";
      const { rows } = await connection.query(findQuery, [
        appointment.service_id,
      ]);
      if (!rows || rows.length === 0) {
        appointmentTypeId = 0; // consultation appt
        console.warn(
          `No Treatment service found in service_config for given serviceId : ${appointment.service_id}`
        );
      }

      // Fetch the current appointment data
      const currentAppointmentQuery = `
        SELECT name, appointment_date, employee_id, appointment_id, service_id
        FROM appointment
        WHERE appointment_group_id = $1 AND appointment_type_id = $2
      `;
      const currentAppointmentResult = await connection.query(currentAppointmentQuery, [
        appointment_group_id,
        appointmentTypeId
      ]);

      if (!currentAppointmentResult.rows || currentAppointmentResult.rows.length === 0) {
        throw new Error(
          `No appointment found for appointment_group_id: ${appointment_group_id} and appointment_type_id: ${appointmentTypeId}`
        );
      }

      const currentAppointment = currentAppointmentResult.rows[0];
      let approvalDetailId = null;
      // Check if appointmentId is changing
      if (currentAppointment.appointment_id !== appointment.id && appointmentTypeId === 1) {
        // First, update ApprovalDetail to remove the foreign key constraint
        const removeConstraintQuery = `
          UPDATE approval_detail
          SET appointment_id = NULL
          WHERE appointment_id = $1
          RETURNING *;
        `;
        const removedConstraintResult = await connection.query(removeConstraintQuery, [
          currentAppointment.appointment_id
        ]);
        console.log(removedConstraintResult,'removedConstraintResult');
        if (removedConstraintResult.rowCount > 0) {
          approvalDetailId = removedConstraintResult.rows[0].id;
          console.log(
            `Removed foreign key constraint for approval_detail records with old appointment_id: ${currentAppointment.appointment_id}`
          );
        } else {
          console.warn(
            `No records found in approval_detail to update for old appointment_id: ${currentAppointment.appointment_id}`
          );
        }
      }

      // Check if the employee exists in providerDetail; insert if not found
      if (currentAppointment.employee_id !== appointment.therapist_id) {

      const checkEmployeeQuery = `
        SELECT employee_id FROM provider_detail WHERE employee_id = $1
      `;
      const employeeResult = await connection.query(checkEmployeeQuery, [appointment.therapist_id]);

      if (!employeeResult.rows || employeeResult.rows.length === 0) {
        const insertEmployeeQuery = `
          INSERT INTO provider_detail (employee_id, center_id, first_name, last_name)
          VALUES ($1 , $2, $3, $4)
        `;
        await connection.query(insertEmployeeQuery, [appointment.therapist_id,'CENTER_ID', 'FIRST_NAME', 'LAST_NAME']);
        console.log(`New employee added to provider_detail: ${appointment.therapist_id}`);
      }
      }
      // Perform the appointment update
      const updateQuery = `
        UPDATE appointment
        SET name = $1,
        appointment_date = $2,
        employee_id = $3,
        appointment_id = $4,
        service_id = $5
        WHERE appointment_group_id = $6
        AND appointment_type_id = $7
        RETURNING *;
      `;
      const values = [
        appointment.service_name,
        appointment.start_time,
        appointment.therapist_id,
        appointment.id,
        appointment.service_id,
        appointment_group_id,
        appointmentTypeId,
      ];
      console.log("updateQuery", updateQuery, "values", values);
      const result = await connection.query(updateQuery, values);

      if (!result || result.rows.length === 0) {
        throw new Error(
          `No appointment found for appointment_group_id: ${appointment_group_id} and appointment_type_id: ${appointmentTypeId}`
        );
      }
      console.log(
        "Appointment Table updated successfully",
        JSON.stringify(result.rows[0])
      );
      // After updating Appointment, update ApprovalDetail with the new appointmentId
      if (currentAppointment.appointment_id !== appointment.id && appointmentTypeId === 1) {
        console.log('approvalDetailId', approvalDetailId);
        const updateApprovalDetailQuery = `
          UPDATE approval_detail
          SET appointment_id = $1
          WHERE appointment_id IS NULL AND id = $2
          RETURNING *;
        `;
        const updatedApprovalDetailResult = await connection.query(updateApprovalDetailQuery, [
          appointment.id, // New appointment ID
          approvalDetailId
        ]);
        
        if (updatedApprovalDetailResult.rowCount > 0) {
          console.log(
            `Updated approval_detail records with new appointment_id: ${appointment.id}`
          );
        } else {
          console.warn(
            `No records found in approval_detail to update for old appointment_id: ${currentAppointment.appointment_id}`
          );
        }
      }

      // Track changes in appointmentHistory table
      const updatedAppointment = result.rows[0];
      const fieldsToTrack = [
        { name: 'name', oldValue: currentAppointment.name, newValue: updatedAppointment.name },
        { name: 'appointment_date', oldValue: currentAppointment.appointment_date, newValue: updatedAppointment.appointment_date },
        { name: 'employee_id', oldValue: currentAppointment.employee_id, newValue: updatedAppointment.employee_id },
        { name: 'appointment_id', oldValue: currentAppointment.appointment_id, newValue: updatedAppointment.appointment_id },
        { name: 'service_id', oldValue: currentAppointment.service_id, newValue: updatedAppointment.service_id },
      ];

      for (const field of fieldsToTrack) {
        if (field.oldValue.toString() !== field.newValue.toString()) {
          await insertAppointmentHistory(
            connection,
            appointment_group_id,
            appointmentTypeId,
            'appointment',
            field.name,
            field.oldValue,
            field.newValue,
            'ZENOTI'
          );
        }
      }
    }

    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error("Error occurred:", error);
    throw error; // Re-throw the error after rollback
  } finally {
    connection.release();
  }
};

async function insertAppointmentHistory(
  connection,
  appointmentGroupId,
  appointmentTypeId,
  tableName,
  field,
  oldValue,
  newValue,
  changedBy
) {
  const insertQuery = `
    INSERT INTO appointment_history
    (appointment_group_id, appointment_type_id, table_name, field, old_value, new_value, changed_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  const values = [appointmentGroupId, appointmentTypeId, tableName, field, oldValue, newValue, changedBy];
  await connection.query(insertQuery, values);
}
