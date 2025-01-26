const {
  fetchZenotiAppointment,
  fetchZenotiInvoice,
} = require("./zenotiService");
const { getAllowedCenterIds } = require("./utils");
const {
  checkForExistingRecord,
  obtainDbUpdateStatus,
  insertRecord,
  updateAppointmentStatus,
} = require("./database");

const processUpdateMessage = async (event, updateStatus) => {
  const invoiceId = event?.detail?.data?.invoice_id;

  if (!invoiceId) {
    console.error("No invoiceId provided");
    return;
  }

  console.log("Invoice ID:", invoiceId);
  console.log("Fetching appointment for Invoice ID:", invoiceId);
  const appointment = await fetchZenotiAppointment(invoiceId);
  if (!appointment) {
    console.error("Failed to fetch appointment.");
    return;
  }

  const { appointment_group_id: appointmentGroupId, guest } = appointment || {};
  const guestId = guest?.id;

  console.log("Fetched appointment:", appointment);

  const allowedCenterIds = getAllowedCenterIds();
  console.log("Allowed Center IDs:", allowedCenterIds);

  const isCenterAllowed =
    allowedCenterIds.includes(appointment?.center_id) ||
    allowedCenterIds.length === 0;

  if (!isCenterAllowed) {
    console.error(
      `processUpdateMessage -> Center Id: ${appointment?.center_id} is restricted`
    );
    return;
  }

  if (!appointment?.appointment_id || !guestId) {
    console.error("Missing appointment ID or guest ID");
    return;
  }

  console.log(`Checking for existing records for appointmentGroupId: ${appointmentGroupId} and guestId: ${guestId}`);
  const records = await checkForExistingRecord(appointmentGroupId, guestId);
  if (records.length > 0) {
    console.log("Existing records found, skipping insertion.");
    return;
  }

  console.log("Obtaining database update status for updateStatus:", updateStatus);
  const dbUpdateStatus = await obtainDbUpdateStatus(updateStatus);
  if (!dbUpdateStatus) {
    console.error(
      `ERROR: The Zenoti Appointment Status ${updateStatus} does not match any values in the database`
    );
    throw new Error("Zenoti Appointment Status Not found");
  }

  console.log("Inserting record into database for appointment:", appointment);
  await insertRecord(appointment, dbUpdateStatus);
};

const updateZenotiAppointmentStatus = async (event, updateStatus) => {
  validateAppointmentEvent(event);

  const { appointment_group_id: appointmentGroupId, guest } =
    event?.detail?.data;
  const guestId = guest?.id;
  const [{ customer_status_type: customerStatusType }] =
    await checkForExistingRecord(appointmentGroupId, guestId);

  console.log("Customer Status Type:", customerStatusType);
  const updateFunction =
    customerStatusType === 0 ? updateFtAppointments : updateRtAppointments;

  console.log(`Calling update function for status type ${customerStatusType}`);
  await updateFunction(event, updateStatus, appointmentGroupId, guestId);
};

async function updateFtAppointments(
  event,
  updateStatus,
  appointmentGroupId,
  guestId
) {
  console.log(`Updating FT appointments for guestId: ${guestId} with status: ${updateStatus}`);
  const statusId = await obtainDbUpdateStatus(updateStatus);

  if (statusId) {
    console.log(`Updating appointment status for appointmentGroupId: ${appointmentGroupId} and guestId: ${guestId}`);
    await updateAppointmentStatus(appointmentGroupId, guestId, statusId);
    console.log("FT appointment status updated successfully.");
  } else {
    console.error(
      `ERROR: The Zenoti Appointment Status ${updateStatus} does not match any values in the database`
    );
    throw new Error("Zenoti Appointment Status Not found");
  }
}

async function updateRtAppointments(
  event,
  updateStatus,
  appointmentGroupId,
  guestId
) {
  const invoiceId = event?.detail?.data?.invoice_id;

  if (!invoiceId) {
    console.error("No invoiceId provided");
    return;
  }

  console.log("Fetching invoice for Invoice ID:", invoiceId);
  const invoiceResp = await fetchZenotiInvoice(invoiceId);
  if (!invoiceResp) {
    console.error("Failed to fetch invoice.");
    return;
  }

  const allowedCenterIds = getAllowedCenterIds();
  const centerId = invoiceResp?.data?.invoice?.center_id;

  console.log("Fetched invoice:", invoiceResp.data.invoice);
  console.log("Allowed Center IDs:", allowedCenterIds);

  if (!allowedCenterIds.includes(centerId) && allowedCenterIds.length > 0) {
    console.error(
      `updateRtAppointments -> Center Id: ${centerId} is restricted`
    );
    return;
  }

  if (!guestId) {
    console.error(`ERROR: No guestId received`);
    throw new Error("No guestId received");
  }

  console.log(`Processing with ${guestId} guestId`);
  const dbUpdateStatus = await obtainDbUpdateStatus(updateStatus);

  if (!dbUpdateStatus) {
    console.error(
      `ERROR: The Zenoti Appointment Status ${updateStatus} does not match any values in the database`
    );
    throw new Error("Zenoti Appointment Status Not found");
  }
  console.log(`Updating appointment status for appointmentGroupId: ${appointmentGroupId}, guestId: ${guestId}, statusId: ${dbUpdateStatus}`);
  await updateAppointmentStatus(appointmentGroupId, guestId, dbUpdateStatus);
  console.log("RT appointment status updated successfully.");
}

function validateAppointmentEvent(event) {
  const guestId = event?.detail?.data?.guest?.id;
  if (!guestId) {
    console.error(`ERROR: No guestId received`);
    throw new Error("No guestId received");
  }

  console.log(`Processing with ${guestId} guestId`);
}

module.exports = {
  processUpdateMessage,
  updateZenotiAppointmentStatus,
  updateFtAppointments,
  updateRtAppointments,
};
