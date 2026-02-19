import { Event, Guest, Reminder, User } from '../types';

const EVENTS_KEY = 'eventmaster_events';
const GUESTS_KEY = 'eventmaster_guests';
const REMINDERS_KEY = 'eventmaster_reminders';
const USERS_KEY = 'eventmaster_users';

// --- Events ---

export const getEvents = (): Event[] => {
  const stored = localStorage.getItem(EVENTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveEvent = (event: Event): void => {
  const events = getEvents();
  const existingIndex = events.findIndex(e => e.id === event.id);
  if (existingIndex >= 0) {
    events[existingIndex] = event;
  } else {
    events.push(event);
  }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
};

export const deleteEvent = (eventId: string): void => {
  const events = getEvents().filter(e => e.id !== eventId);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  
  // Cascade delete guests
  const allGuests = getAllGuests().filter(g => g.eventId !== eventId);
  localStorage.setItem(GUESTS_KEY, JSON.stringify(allGuests));
};

// --- Guests ---

export const getAllGuests = (): Guest[] => {
  const stored = localStorage.getItem(GUESTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const getGuestsByEventId = (eventId: string): Guest[] => {
  return getAllGuests().filter(g => g.eventId === eventId);
};

export const saveGuest = (guest: Guest): void => {
  const guests = getAllGuests();
  const existingIndex = guests.findIndex(g => g.id === guest.id);
  if (existingIndex >= 0) {
    guests[existingIndex] = guest;
  } else {
    guests.push(guest);
  }
  localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
};

export const saveGuests = (newGuests: Guest[]): void => {
  const guests = getAllGuests();
  // Filter out duplicates if any (by ID or CPF? Let's stick to ID for now)
  const existingIds = new Set(guests.map(g => g.id));
  const uniqueNewGuests = newGuests.filter(g => !existingIds.has(g.id));
  
  localStorage.setItem(GUESTS_KEY, JSON.stringify([...guests, ...uniqueNewGuests]));
};

export const checkInGuest = (guestId: string, authorizedBy?: string, method: 'QR' | 'MANUAL' = 'MANUAL'): boolean => {
  const guests = getAllGuests();
  const guestIndex = guests.findIndex(g => g.id === guestId);
  
  if (guestIndex >= 0) {
    if (guests[guestIndex].checkedIn) return false; // Already checked in
    
    guests[guestIndex].checkedIn = true;
    guests[guestIndex].checkInTime = new Date().toISOString();
    guests[guestIndex].checkInMethod = method;
    guests[guestIndex].authorizedBy = authorizedBy;
    localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
    return true;
  }
  return false;
};

// --- Reminders ---

export const getReminders = (): Reminder[] => {
  const stored = localStorage.getItem(REMINDERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveReminder = (reminder: Reminder): void => {
  const reminders = getReminders();
  const existingIndex = reminders.findIndex(r => r.id === reminder.id);
  if (existingIndex >= 0) {
    reminders[existingIndex] = reminder;
  } else {
    reminders.push(reminder);
  }
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
};

export const deleteReminder = (id: string): void => {
  const reminders = getReminders().filter(r => r.id !== id);
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
};

export const toggleReminder = (id: string): void => {
  const reminders = getReminders();
  const index = reminders.findIndex(r => r.id === id);
  if (index >= 0) {
    reminders[index].completed = !reminders[index].completed;
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  }
};

// --- Users (Admins/Staff) ---

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const deleteUser = (id: string): void => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};
