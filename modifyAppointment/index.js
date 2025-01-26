import { modifyAppointment } from './services/appointmentService.js';

export const handler = async (event) => {
    try {
        console.log('event:', JSON.stringify(event));
        if (event?.detail?.event_type === 'AppointmentGroup.Updated'){
          const appointmentList = event?.detail?.data?.appointments
          if (appointmentList.length > 0){
            await modifyAppointment(event, appointmentList, event?.detail?.data?.appointment_group_id)
          }
        }
    
      } catch (error) {
        console.error('Error', error);
        throw new Error(`ERROR: ${error}`);
      }
  };
  

// let event1 = {
//     "version": "0",
//     "id": "83179ae1-ac2d-a261-00be-b296e32eb13a",
//     "detail-type": "appointment",
//     "source": "zenoti",
//     "account": "572502381092",
//     "time": "2024-10-26T13:37:23Z",
//     "region": "us-west-2",
//     "resources": [],
//     "detail": {
//         "id": "671cf093504fa025e02d2609",
//         "event_id": "671cf093504fa025e02d2608",
//         "event_schema": "v1",
//         "event_resource": null,
//         "event_type": "AppointmentGroup.Updated",
//         "event_timestamp": "2024-10-26T13:37:23.4444536Z",
//         "data": {
//             "invoice_id": "2d85e60e-5eff-45bf-a9a9-a63c6d52a5c5",
//             "invoice_number": "2078",
//             "invoice_number_prefix": "BREA",
//             "appointment_group_id": "d3f84f1c-fa08-4c10-9a6f-cdbc9295757a",
//             "organization_id": "da244c93-f6d7-4d07-be42-04428188cf92",
//             "center_id": "fedba080-21ab-44e3-9ff5-54a410fe2c48",
//             "center_Name": "Brea",
//             "guest": {
//                 "id": "3ffc817d-c47e-4ff9-922e-2e0992f6a762",
//                 "first_name": "Rhythm",
//                 "last_name": "LLC",
//                 "email": "rhytum@liftoffllc.com"
//             },
//             "appointments": [
//                 {
//                     "id": "a1af2169-1407-4a02-863a-1b9d5ed16b34",
//                     "invoice_item_id": "ddba73bf-d4f0-41ca-853c-9f8cdcefe407",
//                     "service_name": "New Client Signature Laser Facial (Long 15 mins) (Y)",
//                     "service_id": "257dacea-8c08-46a7-9f57-38da26ff5cfb",
//                     "start_time": "2024-10-26T17:45:00",
//                     "end_time": "2024-10-26T18:00:00",
//                     "start_time_in_center": "2024-10-26T10:45:00",
//                     "end_time_in_center": "2024-10-26T11:00:00",
//                     "creation_date": "2024-10-26T13:37:23",
//                     "last_updated_on": "2024-10-26T13:37:23",
//                     "service_duration_in_minutes": 15,
//                     "has_add_ons": false,
//                     "is_add_on": false,
//                     "therapist_name": "QA NPPA 1 Brea",
//                     "therapist_id": "00cd7210-35fb-4956-af9a-87aa7a22f129",
//                     "is_recurring": false,
//                     "show_in_calendar": true,
//                     "appointment_type": 2,
//                     "therapist_request_type": 0,
//                     "room_id": "0e8e94d8-72b8-493d-9777-e7cec52f3df3",
//                     "room_name": "Laser (VSL)",
//                     "equipment_name": ""
//                 },
//                 {
//                     "id": "7e542eb1-28b6-4f85-a91d-aa1c128f583b",
//                     "invoice_item_id": "bf3247c5-96ba-4fc1-b926-8ed89bce76a5",
//                     "service_name": "(30 min) New Consultation",
//                     "service_id": "a69ded71-e222-42b8-a501-e2c3f21bd013",
//                     "start_time": "2024-10-26T17:00:00",
//                     "end_time": "2024-10-26T17:30:00",
//                     "start_time_in_center": "2024-10-26T10:00:00",
//                     "end_time_in_center": "2024-10-26T10:30:00",
//                     "creation_date": "2024-10-26T13:20:29",
//                     "last_updated_on": "2024-10-26T13:37:23",
//                     "service_duration_in_minutes": 30,
//                     "has_add_ons": false,
//                     "is_add_on": false,
//                     "therapist_name": "Eula NPPA Brea",
//                     "therapist_id": "qpe4ec51-de43-4e97-bdd1-2f56b79fdac7",
//                     "is_recurring": false,
//                     "show_in_calendar": true,
//                     "appointment_type": 2,
//                     "therapist_request_type": 0,
//                     "room_id": "fff05b8a-ade6-4cc9-9bc7-6742d61a56d5",
//                     "room_name": "Laser (VSL) + Resurfacing",
//                     "equipment_name": ""
//                 }
                
//             ]
//         }
//     }
// }
// handler(event1);