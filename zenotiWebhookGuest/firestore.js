const admin = require("firebase-admin");
const { getServiceAccount } = require('./config');

let fireStoreClient = null;

const getFireStore = async (serviceAccount, databaseURL) => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });
  }
  return admin.firestore();
};

const getFirestoreClient = async () => {
  if (!fireStoreClient) {
    const serviceAccount = await getServiceAccount();
    const databaseUrl = `${serviceAccount.project_id}.firebaseio.com`;
    const firestore = await getFireStore(serviceAccount, databaseUrl);
    fireStoreClient = {
      async addDoc(collection, data) {
        const result = await firestore.collection(collection).add(data);
        return result;
      },
      async findExistingDoc(collection, query) {
        const querySnapshot = await firestore
          .collection(collection)
          .where(query.field, query.operator, query.value)
          .get();
        return !!querySnapshot.size;
      },
    };
  }
  return fireStoreClient;
};

module.exports = {
  getFirestoreClient,
};
