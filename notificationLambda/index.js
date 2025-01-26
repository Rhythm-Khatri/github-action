import { getDocumentDbConnection } from './documentDB.js';
import { sendNotification } from './fcmService.js';
import AWS from 'aws-sdk';
import { getTokens } from './services/getTokens.js';
import { getNotificationPayload } from './services/getNotificationPayload.js';
import { getSecretValue } from './secretsManager.js';
import dotenv from 'dotenv';

dotenv.config();
// AWS.config.update({ region: 'us-west-2' });
// const secretsManager = new AWS.SecretsManager();

export const handler = async (event) => {
  const sqsMessage = event.Records[0].body;
  console.log('payload', sqsMessage);
  const { appointmentGroupId, appointmentStatus, consultProvider, treatmentProvider, centerId } = JSON.parse(sqsMessage);

  // console.log('sqsMessage', sqsMessage);
  // Get DocumentDB secret from AWS Secrets Manager
  const secret_name = process.env.SECRET_NAME;
  console.time("getSecretValue");
  const secret = await getSecretValue(secret_name);
console.timeEnd("getSecretValue");

  console.time("getDocumentDbConnection");
  // Get DocumentDB connection
  await getDocumentDbConnection(secret);
  console.timeEnd("getDocumentDbConnection");

  console.time("getTokens");
  let deviceTokens = await getTokens(sqsMessage);
  console.timeEnd("getTokens");
  console.log('deviceTokens', deviceTokens);

  // Send FCM notification to all devices
  const notificationPayload = getNotificationPayload(appointmentStatus);

  try {
    await sendNotification(deviceTokens, notificationPayload, secret);
  } catch (error) {
    console.error('Failed to send notification', error);
  }
};

// Simulate an SQS event
// let event = {
//   "Records": [
//     {
//       "messageId": "1c6a9f58-3fb0-4c72-bf45-93cc21f86db2",
//       "receiptHandle": "AQEBwJnKpT0r1x0Q5Hv...",
//       "body": "{\"appointmentGroupId\": \"098f6bcd4621d373cade4e832627b4f6\", \"appointmentStatus\": \"Needs Approval\", \"consultProvider\": \"44cd7210-35fb-4956-af9a-87aa7a22f129\", \"centerId\": \"fedba080-21ab-44e3-9ff5-54a410fe2c48\", \"treatmentProvider\": \"44cd7210-35fb-4956-af9a-87aa7a22f12912\"}",
//       "attributes": {
//         "ApproximateReceiveCount": "1",
//         "SentTimestamp": "1629816794361",
//         "SenderId": "AIDAEXAMPLE:your-queue",
//         "ApproximateFirstReceiveTimestamp": "1629816794372"
//       },
//       "messageAttributes": {},
//       "md5OfBody": "098f6bcd4621d373cade4e832627b4f6",
//       "eventSource": "aws:sqs",
//       "eventSourceARN": "arn:aws:sqs:us-east-1:123456789012:Dev-NotificationQueue",
//       "awsRegion": "us-east-1"
//     }
//   ]
// };

// let event1 = {
//   "Records": [
//     {
//       "messageId": "1c6a9f58-3fb0-4c72-bf45-93cc21f86db2",
//       "receiptHandle": "AQEBwJnKpT0r1x0Q5Hv...",
//       "body": "{\"appointmentGroupId\": \"098f6bcd4621d373cade4e832627b4f6\", \"appointmentStatus\": \"Approved\", \"consultProvider\": \"c6a971e7-8200-4cc1-8c5c-952e76d6199d\", \"centerId\": \"0c075817-f2f0-450b-8024-ea3e9c5b1d74\", \"treatmentProvider\": \"7d1fe974-31a4-4d1a-85e8-c1ee2a430ae1\"}",
//       "attributes": {
//         "ApproximateReceiveCount": "1",
//         "SentTimestamp": "1629816794361",
//         "SenderId": "AIDAEXAMPLE:your-queue",
//         "ApproximateFirstReceiveTimestamp": "1629816794372"
//       },
//       "messageAttributes": {},
//       "md5OfBody": "098f6bcd4621d373cade4e832627b4f6",
//       "eventSource": "aws:sqs",
//       "eventSourceARN": "arn:aws:sqs:us-east-1:123456789012:Dev-NotificationQueue",
//       "awsRegion": "us-east-1"
//     }
//   ]
// };


// Execute the handler
// handler(event);
