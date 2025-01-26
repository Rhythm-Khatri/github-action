import NotificationDevice from "./../model/notificationDevice.js";
import { AppointmentStatus } from "../appointmentStatus.enum.js";

export const getTokens = async (sqsMessage) => {
  // Get DocumentDB connection
  // await getDocumentDbConnection();
  const { appointmentStatus, consultProvider, treatmentProvider, centerId, workflow } =
    JSON.parse(sqsMessage);

  if (
    appointmentStatus === AppointmentStatus.NEEDS_APPROVAL ||
    appointmentStatus === AppointmentStatus.RESUBMITTED
  ) {
    if(workflow!=='AZ') return getNPPATokens(consultProvider);
    else {
      console.log('workflow', workflow);
      return getRNTokens(consultProvider);
    }
    
  } else if (
    appointmentStatus === AppointmentStatus.APPROVED ||
    appointmentStatus === AppointmentStatus.NOT_APPROVED
  ) {
    let rnTokens = await getRNTokens(treatmentProvider);
    let fohTokens = await getFohTokens(centerId);
    let tokens = [...rnTokens, ...fohTokens];
    return tokens;
  } else {
    console.log("No Appointment Status");
  }
  return [];
};

const getRNTokens = async (rnEmployee) => {
  console.log(`Getting tokens for RN_Employee with id: ${rnEmployee}`);

  const notificationDevices = await NotificationDevice.find(
    {
      "roles.RN.userId": rnEmployee, 
    },
    {
      "roles.RN.$": 1, // Projects only the matching user(s) within the RN role
    }
  );

  // No documents found or RN role isn't there,
  if (!notificationDevices || notificationDevices.length === 0) {
    console.log("No tokens found for this RN.");
    return [];
  }
  // Aggregate tokens from all matching users
  const tokens = notificationDevices.flatMap((device) => {
    const rnUsers = device.roles.get("RN") || [];
    const matchedUser = rnUsers.find(user => user.userId === rnEmployee);
    
    // If a matched user is found, extract tokens; otherwise, return an empty array
    return matchedUser ? matchedUser.deviceTokens.map((token) => token.token) : [];
  });

  console.log("RN tokens:", tokens);
  return tokens;
};

const getNPPATokens = async (nppaEmployee) => {
  console.log(`Getting tokens for NPPA_Employee with id: ${nppaEmployee}`);

  const notificationDevices = await NotificationDevice.find(
    {
      "roles.NPPA.userId": nppaEmployee,
    },
    {
      "roles.NPPA.$": 1, // Projects only the matching user(s) within the NPPA role
    }
  );

  // If no documents found or NPPA role isn't there, return an empty array
  if (!notificationDevices || notificationDevices.length === 0) {
    console.log("No tokens found for this NPPA.");
    return [];
  }
  // Aggregate tokens from all matching users
  const tokens = notificationDevices.flatMap((device) => {
    const nppaUsers = device.roles.get("NPPA") || [];
    const matchedUser = nppaUsers.find(user => user.userId === nppaEmployee);
    
    // If a matched user is found, extract tokens; otherwise, return an empty array
    return matchedUser ? matchedUser.deviceTokens.map((token) => token.token) : [];
  });

  console.log("NPPA tokens:", tokens);
  return tokens;
};

const getFohTokens = async (centerId) => {
  // Find the notification device by centerId and get all FOH users
  const notificationDevice = await NotificationDevice.findOne(
    { centerId: centerId }, // Filters by centerId
    { "roles.FOH": 1 } // Projects only the FOH role
  );

  // If no FOH role is found, return an empty array
  if (!notificationDevice || !notificationDevice.roles.has("FOH")) {
    console.log("No FOH users found");
    return [];
  }

  const fohUsers = notificationDevice.roles.get("FOH");
  console.log(
    `Getting tokens for all FOH_Employees having ids : ${fohUsers.map(
      (user) => user.userId
    )}`
  );
  let tokens = [];

  // Iterate over all FOH users to gather their device tokens
  fohUsers.forEach((user) => {
    user.deviceTokens.forEach((token) => {
      tokens.push(token.token); // Collect all tokens
    });
  });
  console.log('FOH tokens', tokens);
  return tokens.length ? tokens : [];
};
