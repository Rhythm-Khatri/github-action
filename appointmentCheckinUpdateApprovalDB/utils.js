const center_ids = process.env.CENTER_IDS;

function getAllowedCenterIds() {
  return (center_ids?.split(",") || [])
    .map((id) => id.trim())
    .filter((id) => id !== "");
}

function handleUpdateResult(result) {
  if (result.rowCount > 0) {
    console.log("Update successful. Rows affected:", result.rowCount);
  } else {
    console.log("No matching records found for the update.");
  }
}

module.exports = {
  getAllowedCenterIds,
  handleUpdateResult,
};
