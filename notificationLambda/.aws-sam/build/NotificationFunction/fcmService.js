import admin from 'firebase-admin';
import { getSecretValue } from './secretsManager.js';

let firebaseInitialized = false;

async function initializeFirebase(secret) {
  if (!firebaseInitialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: secret.FIREBASE_PROJECT_ID,
        privateKey: secret.FIREBASE_PRIVATE_KEY,
        clientEmail: secret.FIREBASE_CLIENT_EMAIL,
      }),
    });

    firebaseInitialized = true;
  }
}

export async function sendNotification(tokens, message, secret) {
    console.time("initializeFirebase");
  await initializeFirebase(secret);
  console.timeEnd("initializeFirebase");

  const title = message?.title ? message?.title : 'Appointment Status';
  const body = message?.body ? message?.body : 'Your appointment status is Pending';
    const payload = {
        apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                alert: {
                  title,
                  body,
                },
                sound: 'notification-1.wav',
              },
            },
          },
          tokens: tokens,
    }
  try {
    // console.time("sendEachForMulticast");
    const response = await admin.messaging().sendEachForMulticast(payload);
    // console.timeEnd("sendEachForMulticast");
    console.log(`Successfully sent notifications: ${response.successCount}`);
    console.log(`Failed to sent notifications: ${response.failureCount}`);
    response.responses.forEach((response) => {
      if(response.success) {
        console.log('Notification sent successfully:');
      }
      else if (!response.success) {
        console.log('Error sending notification:', response.error.message);
      }
    })
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
