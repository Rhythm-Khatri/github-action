const { APPOINTMENT_STATUS } = require("./constants");
const { processUpdateMessage, updateZenotiAppointmentStatus } = require("./appointmentProcessing");
const { logOperation } = require("./constants");

const handleAppointmentStatusUpdate = async (event, appointment_group_status) => {
  console.log("Handling appointment status update for status:", appointment_group_status);
  
  switch (appointment_group_status) {
    case APPOINTMENT_STATUS.CHECK_IN:
      console.log("Processing CHECK IN");
      await processUpdateMessage(event, appointment_group_status);
      break;
    case APPOINTMENT_STATUS.CANCEL:
    case APPOINTMENT_STATUS.NO_SHOW:
    case APPOINTMENT_STATUS.CONFIRM:
      console.log(`Logging operation for status: ${appointment_group_status}`);
      logOperation[appointment_group_status]?.();
      await updateZenotiAppointmentStatus(event, appointment_group_status);
      break;
    default:
      console.error(`Unknown appointment_group_status: ${appointment_group_status}`);
      throw new Error(`Unknown appointment_group_status: ${appointment_group_status}`);
  }
};

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event));
    const { appointment_group_status } = event?.detail?.data;

    if (event?.detail?.event_type !== "AppointmentGroup.Status") {
      console.warn("Event type is not AppointmentGroup.Status. Exiting handler.");
      return;
    }

    await handleAppointmentStatusUpdate(event, appointment_group_status);

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("Record already exists:", error.message);
    } else {
      console.error("Error during processing:", error.message || error);
    }
  }
};
