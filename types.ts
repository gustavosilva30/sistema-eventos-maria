export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  imageUrl: string;
  attractions?: string[];
  gallery?: string[];
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  checkedIn: boolean;
  checkInTime?: string;
  checkInMethod?: 'QR' | 'MANUAL';
  authorizedBy?: string;
  qrCodeData: string; // Unique string for the QR
}

export interface Reminder {
  id: string;
  text: string;
  date: string;
  completed: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'STAFF'; // Administrador or Contratado
  contact: string;
}

export interface QRCodePayload {
  eventId: string;
  guestId: string;
  valid: boolean;
}

export type ViewState = 'DASHBOARD' | 'CREATE_EVENT' | 'EVENT_DETAILS' | 'SCANNER' | 'GUESTS' | 'REMINDERS' | 'SETTINGS';
