import { deleteAppointment } from './services/appointmentService.js';
import { APPOINTMENT_STATUS } from './utils/constants.js';

export const handler = async (event) => {
  try {
    console.log('event:', JSON.stringify(event));

    if (event?.detail?.event_type === 'AppointmentGroup.Updated') {
      const appointmentList = event?.detail?.data?.appointments;
      if (appointmentList.length === 0) {
        await deleteAppointment(event, APPOINTMENT_STATUS.DELETE);
      }
    }
  } catch (error) {
    console.error('Error', error);
    throw new Error(`ERROR: ${error}`);
  }
};

// let event = {
//     "version": "0",
//     "id": "853584c7-37a0-6168-3da1-a59a6b090ed3",
//     "detail-type": "appointment",
//     "source": "zenoti",
//     "account": "572502381092",
//     "time": "2024-10-15T11:46:43Z",
//     "region": "us-west-2",
//     "resources": [],
//     "detail": {
//         "id": "670e5623504fa025e02ce236",
//         "event_id": "670e5623504fa025e02ce235",
//         "event_schema": "v1",
//         "event_resource": null,
//         "event_type": "AppointmentGroup.Updated",
//         "event_timestamp": "2024-10-15T11:46:43.2022681Z",
//         "data": {
//             "appointment_group_id": "d3f84f1c-fa08-4c10-9a6f-cdbc9295757a",
//             "organization_id": "da244c93-f6d7-4d07-be42-04428188cf92",
//             "center_id": "0c075817-f2f0-450b-8024-ea3e9c5b1d74",
//             "guest": {
//                 "id": "e4fc389d-ba18-4f30-b6cd-643501419b15",
//                 "first_name": "test",
//                 "last_name": "p",
//                 "email": "testrefpackage01@mailinator.com"
//             },
//             "appointments": []
//         }
//     }
// }

// handler(event);