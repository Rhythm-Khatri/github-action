const { handler } = require("./guestWebhookStrategies");
const { getDBConnection } = require("./database");

exports.handler = async (event) => {
  let connection;
  console.log("Received event:", JSON.stringify(event, null, 2));
  
  try {
    connection = await getDBConnection();
    console.log("Database connection established successfully.");
    
    const result = await handler(event, connection);
    console.log("Handler executed successfully. Result:", result);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Event processed successfully", result }),
    };
  } catch (error) {
    return handleError(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed.");
    }
  }
};

const handleError = (error) => {
  console.error("Error:", error);
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: "Internal Server Error",
      error: error.message,
    }),
  };
};
// let event = {
//   version: '0',
//   id: 'bee41cd7-528a-462d-4481-fe46f8afaf03',
//   'detail-type': 'guest',
//   source: 'zenoti',
//   account: '572502381092',
//   time: '2024-11-10T18:03:05Z',
//   region: 'us-west-2',
//   resources: [],
//   detail: {
//     id: '6730f559252d0661cf26f877',
//     event_id: '6730f559252d0661cf26f875',
//     event_schema: 'v1',
//     event_resource: null,
//     event_type: 'Guest.Updated',
//     event_timestamp: '2024-11-10T18:03:05.2283306Z',
//     data: {
//       id: '11df7e6d-7de1-4baf-876e-a5cd9b59e1dc',
//       _id: 85957097,
//       code: 'BRE-G2269',
//       user_type_id: '041664b5-fe6e-4f95-8a76-25e69fe4599d',
//       center_id: '0c075817-f2f0-450b-8024-ea3e9c5b1d74',
//       center_name: 'Newport Beach',
//       created_date: '2024-10-25T09:49:22',
//       personal_info: [Object],
//       address_info: [Object],
//       preferences: [Object],
//       referral: [Object],
//       additional_details: [Object]
//     }
//   }
// }
// handler(event);