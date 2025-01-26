const { getZenotiSecretValue } = require("./config");
const axios = require('axios');

let zenotiSecretValues;

const initializeSecrets = async () => {
  if (!zenotiSecretValues) {
    zenotiSecretValues = await getZenotiSecretValue();
  }
};

const fetchZenotiInvoice = async (invoiceId) => {
  await initializeSecrets();
  try {
    const invoiceResp = await axios.get(
      `${zenotiSecretValues.ZENOTI_API_URL}/v1/invoices/${invoiceId}?expand=Appointments`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `apikey ${zenotiSecretValues.ZENOTI_API_KEY}`,
        },
      }
    );

    return invoiceResp;
  } catch (error) {
    console.error("Error fetching Zenoti invoice:", error.message);
    return null;
  }
};

const fetchZenotiAppointment = async (invoiceId) => {
  await initializeSecrets();
  try {
    const invoiceResp = await fetchZenotiInvoice(invoiceId);
    if (!invoiceResp) {
      console.error("No invoice response received");
      return null;
    }

    const isClosed = invoiceResp?.data?.is_closed || false;

    if (isClosed) {
      console.error("Appointment is closed");
      return null;
    }

    const appointments = invoiceResp?.data?.invoice?.appointments || [];
    const newClientConsultationIds = zenotiSecretValues.ZENOTI_SERVICE_NEW_CLIENT_CONSULTATION_ID.split(",");

    if (appointments.length > 1) {
      appointments.sort((a, b) => {
        const aIsConsultation = newClientConsultationIds.includes(a.service_id);
        const bIsConsultation = newClientConsultationIds.includes(b.service_id);

        if (aIsConsultation && !bIsConsultation) {
          return -1;
        } else if (!aIsConsultation && bIsConsultation) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    console.log('Sorted appointments:', appointments);

    const appointmentId = appointments[0]?.id;
    if (!appointmentId) {
      console.error("AppointmentId not found");
      return null;
    }

    const appointment = await axios.get(
      `${zenotiSecretValues.ZENOTI_API_URL}/v1/appointments/${appointmentId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `apikey ${zenotiSecretValues.ZENOTI_API_KEY}`,
        },
      }
    );

    return {
      ...appointment.data[0],
      center_id: invoiceResp.data.invoice.center_id,
    };
  } catch (error) {
    console.error("Error fetching Zenoti appointment:", error.message);
    return null;
  }
};

module.exports = {
  fetchZenotiInvoice,
  fetchZenotiAppointment,
};
