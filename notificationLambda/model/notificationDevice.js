import mongoose from 'mongoose';
const { Schema } = mongoose;

// Device token schema
const deviceTokenSchema = new Schema({
  token: { type: String, required: true },
  addedAt: { type: Date, required: true },
});

// User schema
const userSchema = new Schema({
  userId: { type: String, required: true },
  deviceTokens: { type: [deviceTokenSchema], default: [] },
});

// Main schema for NotificationDevice
const notificationDeviceSchema = new Schema({
  centerId: { type: String, required: true },
  roles: {
    type: Map,
    of: [userSchema], // Mapping dynamic roles (FOH, RN, NPPA) to arrays of users
    default: {},
  },
}, { strict: false }); // Allows dynamic roles

// Create the NotificationDevice model
const NotificationDevice = mongoose.model('NotificationDevice', notificationDeviceSchema);

export default NotificationDevice;
