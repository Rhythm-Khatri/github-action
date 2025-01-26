import { AppointmentStatus } from '../appointmentStatus.enum.js';

export const getNotificationPayload = (appointmentStatus) => {
    if (appointmentStatus === AppointmentStatus.NEEDS_APPROVAL) {
        return {
            title: 'New Client Needs Approval',
            body: 'Approve new client photos and chart',
        };
    } else if (appointmentStatus === AppointmentStatus.RESUBMITTED) {
        return {
            title: 'Resubmitted New Client Needs Approval',
            body: 'Approve resubmitted new client photos and chart',
        };
    } else if (appointmentStatus === AppointmentStatus.APPROVED) {
        return {
            title: 'Client has been Approved',
            body: 'Ready for treatment',
        };
    } else if (appointmentStatus === AppointmentStatus.NOT_APPROVED) {
        return {
            title: 'Client has been Denied',
            body: 'Review comments',
        };
    } 
}