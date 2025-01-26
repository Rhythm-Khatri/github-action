const validateEvent = (event) => {
  if (!event) {
    throw new Error("Event object is missing");
  }
  if (!event.event_type) {
    throw new Error("Event event_type is missing");
  }
  if (!event.data) {
    throw new Error("Event data is missing");
  }
  if (!event.data.id) {
    throw new Error("Event guest id is missing");
  }
  if (!event.data.personal_info?.email) {
    throw new Error("Event guest email is missing");
  }
  if (typeof event.data.personal_info.email !== "string") {
    throw new Error("Event email is not a string");
  }
  return true;
};

module.exports = {
  validateEvent,
};
