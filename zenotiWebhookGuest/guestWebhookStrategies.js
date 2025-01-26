const { getFirestoreClient } = require('./firestore');
const { validateEvent } = require('./eventValidator');

const GuestWebhookStrategies = {
  "Guest.Created": handleCreateEvent,
  "Guest.Updated": handleUpdateEvent,
  "Guest.Deleted": handleDeleteEvent,
};

exports.handler = async (event, connection) => {
  try {
    const { detail: sourceEvent } = event;
    validateEvent(sourceEvent);
    const { data, event_type } = sourceEvent;
    const result = await GuestWebhookStrategies[event_type](data, connection);
    if (result) {
      console.log("Document added with ID: ", result.id);
    }
  } catch (err) {
    handleError(err);
  }
};

async function handleCreateEvent(data) {
  const collection = "guestDetails";
  const firestoreClient = await getFirestoreClient();
  const guest = mapGuestEventToFirebaseGuest(data);
  await verifyNoExistingGuest(collection, guest.email);
  const result = await firestoreClient.addDoc(collection, guest);
  return result;
}

async function handleUpdateEvent(data, connection) {
  try {
    await updateGuestDetail(data, connection);
    console.log(`Updated guest detail for guest ID ${data.id}`);
  } catch (error) {
    console.error(`Error updating guest detail for guest ID ${data.id}:`, error);
  }
}

const updateGuestDetail = async (data, connection) => {
  const { first_name, last_name } = data.personal_info;
  const guestId = data.id;

  const appointmentGroupQuery =
    "SELECT appointment_group_id FROM appointment_group WHERE guest_id = $1 ORDER BY id DESC LIMIT 1";

  const selectQuery =
    "SELECT first_name, last_name FROM guest WHERE guest_id = $1";

  const updateQuery =
    "UPDATE guest SET first_name = $1, last_name = $2 WHERE guest_id = $3";

  const noAppointmentGroupId = "no_appointment_group_id";

  try {
    await connection.query("BEGIN");
    console.log(`Transaction started for guest ID: ${guestId}`);

    const appointmentGroupResult = await connection.query(appointmentGroupQuery, [guestId]);
    const appointmentGroupId =
      appointmentGroupResult.rows.length > 0
        ? appointmentGroupResult.rows[0].appointment_group_id
        : noAppointmentGroupId;

    console.log(`Appointment group ID found: ${appointmentGroupId}`);

    const selectResult = await connection.query(selectQuery, [guestId]);
    if (selectResult.rows.length === 0) {
      throw new Error(`Guest with ID ${guestId} not found.`);
    }

    const oldFirstName = selectResult.rows[0].first_name;
    const oldLastName = selectResult.rows[0].last_name;

    console.log(`Current values for guest ID ${guestId}: first_name = ${oldFirstName}, last_name = ${oldLastName}`);

    if (first_name !== oldFirstName || last_name !== oldLastName) {
      const values = [first_name, last_name, guestId];
      await connection.query(updateQuery, values);
      console.log(`Updated guest ID ${guestId}: first_name = ${first_name}, last_name = ${last_name}`);

      const changeLogs = [];

      if (first_name !== oldFirstName) {
        changeLogs.push({
          field: "first_name",
          oldValue: oldFirstName,
          newValue: first_name,
        });
      }

      if (last_name !== oldLastName) {
        changeLogs.push({
          field: "last_name",
          oldValue: oldLastName,
          newValue: last_name,
        });
      }

      const logAppointmentHistoryQuery = `
        INSERT INTO appointment_history 
        (appointment_group_id, appointment_type_id, table_name, field, old_value, new_value, changed_at, changed_by) 
        VALUES ($1, NULL, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
      `;

      for (const log of changeLogs) {
        const logValues = [
          appointmentGroupId,
          'guest',
          log.field,
          log.oldValue,
          log.newValue,
          null,
        ];
        await connection.query(logAppointmentHistoryQuery, logValues);
        console.log(`Logged change for guest ID ${guestId}: field = ${log.field}, oldValue = ${log.oldValue}, newValue = ${log.newValue}`);
      }
    } else {
      console.log(`No changes detected for guest ID ${guestId}.`);
    }

    await connection.query("COMMIT");
    console.log(`Transaction committed for guest ID: ${guestId}`);
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error(`Error occurred for guest ID ${guestId}:`, error);
    throw error;
  } finally {
    if (connection._connected) {
      await connection.release();
      console.log(`Connection released for guest ID: ${guestId}`);
    }
  }
};



async function handleDeleteEvent(data) {
  console.log(data);
}

function mapGuestEventToFirebaseGuest(data) {
  const {
    id,
    personal_info: { email },
  } = data;
  return {
    email: email.toLowerCase(),
    guest_id: id,
    is_password_set: false,
    source: "lambda",
  };
}

async function verifyNoExistingGuest(collection, email) {
  const firestoreClient = await getFirestoreClient();
  const query = {
    field: "email",
    operator: "==",
    value: email,
  };
  const existingGuest = await firestoreClient.findExistingDoc(
    collection,
    query
  );
  if (existingGuest) {
    throw new Error(`Guest with email ${email} already exists.`);
  }
}

function handleError(err) {
  console.error("Error processing event:", err);
  throw new Error("Internal Server Error");
}
