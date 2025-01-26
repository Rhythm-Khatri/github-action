const APPOINTMENT_STATUS = {
  CHECK_IN: 2,
  CANCEL: -1,
  NO_SHOW: -2,
  CONFIRM: 4,
};

const logOperation = {
  [-1]: () => console.log("Cancelling Appointment"),
  [-2]: () => console.log("Processing NO SHOW"),
  [4]: () => console.log("Processing CONFIRM"),
  [2]: () => console.log("Processing CHECK IN"),
};

module.exports = {
  APPOINTMENT_STATUS,
  logOperation
}