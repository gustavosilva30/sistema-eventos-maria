import { Event, Guest, Reminder, User } from '../types';
import { supabase } from './supabaseService';

// --- Events ---

export const getEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return data.map(event => ({
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,
    description: event.description,
    imageUrl: event.image_url,
    attractions: event.attractions,
    gallery: event.gallery
  }));
};

export const getEventById = async (id: string): Promise<Event | null> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching event by ID:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    date: data.date,
    location: data.location,
    description: data.description,
    imageUrl: data.image_url,
    attractions: data.attractions,
    gallery: data.gallery
  };
};

export const saveEvent = async (event: Event): Promise<void> => {
  const eventData = {
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,
    description: event.description,
    image_url: event.imageUrl,
    attractions: event.attractions || [],
    gallery: event.gallery || []
  };

  const { error } = await supabase
    .from('events')
    .upsert(eventData, { onConflict: 'id' });

  if (error) {
    console.error('Error saving event:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  // Delete guests first (cascade should handle this, but being explicit)
  await supabase
    .from('guests')
    .delete()
    .eq('event_id', eventId);

  // Delete event
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// --- Guests ---

export const getAllGuests = async (): Promise<Guest[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guests:', error);
    return [];
  }

  return data.map(guest => ({
    id: guest.id,
    eventId: guest.event_id,
    name: guest.name,
    cpf: guest.cpf,
    phone: guest.phone,
    email: guest.email,
    checkedIn: guest.checked_in,
    checkInTime: guest.check_in_time,
    checkInMethod: guest.check_in_method as 'QR' | 'MANUAL',
    authorizedBy: guest.authorized_by,
    qrCodeData: guest.qr_code_data
  }));
};

export const getGuestsByEventId = async (eventId: string): Promise<Guest[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guests by event:', error);
    return [];
  }

  return data.map(guest => ({
    id: guest.id,
    eventId: guest.event_id,
    name: guest.name,
    cpf: guest.cpf,
    phone: guest.phone,
    email: guest.email,
    checkedIn: guest.checked_in,
    checkInTime: guest.check_in_time,
    checkInMethod: guest.check_in_method as 'QR' | 'MANUAL',
    authorizedBy: guest.authorized_by,
    qrCodeData: guest.qr_code_data
  }));
};

export const saveGuest = async (guest: Guest): Promise<void> => {
  const guestData = {
    id: guest.id,
    event_id: guest.eventId,
    name: guest.name,
    cpf: guest.cpf,
    phone: guest.phone,
    email: guest.email,
    checked_in: guest.checkedIn,
    check_in_time: guest.checkInTime,
    check_in_method: guest.checkInMethod,
    authorized_by: guest.authorizedBy,
    qr_code_data: guest.qrCodeData
  };

  const { error } = await supabase
    .from('guests')
    .upsert(guestData, { onConflict: 'id' });

  if (error) {
    console.error('Error saving guest:', error);
    throw error;
  }
};

export const saveGuests = async (newGuests: Guest[]): Promise<void> => {
  const guestsData = newGuests.map(guest => ({
    id: guest.id,
    event_id: guest.eventId,
    name: guest.name,
    cpf: guest.cpf,
    phone: guest.phone,
    email: guest.email,
    checked_in: guest.checkedIn,
    check_in_time: guest.checkInTime,
    check_in_method: guest.checkInMethod,
    authorized_by: guest.authorizedBy,
    qr_code_data: guest.qrCodeData
  }));

  const { error } = await supabase
    .from('guests')
    .upsert(guestsData, { onConflict: 'id' });

  if (error) {
    console.error('Error saving guests:', error);
    throw error;
  }
};

export const deleteGuest = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting guest:', error);
    throw error;
  }
};

export const getGuestById = async (id: string): Promise<Guest | null> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching guest by ID:', error);
    return null;
  }

  return {
    id: data.id,
    eventId: data.event_id,
    name: data.name,
    cpf: data.cpf,
    phone: data.phone,
    email: data.email,
    checkedIn: data.checked_in,
    checkInTime: data.check_in_time,
    checkInMethod: data.check_in_method as 'QR' | 'MANUAL',
    authorizedBy: data.authorized_by,
    qrCodeData: data.qr_code_data
  };
};

export const checkInGuest = async (
  guestId: string, 
  authorizedBy?: string, 
  method: 'QR' | 'MANUAL' = 'MANUAL'
): Promise<boolean> => {
  // First check if guest is already checked in
  const { data: guest, error: fetchError } = await supabase
    .from('guests')
    .select('checked_in')
    .eq('id', guestId)
    .single();

  if (fetchError || !guest) {
    console.error('Error fetching guest:', fetchError);
    return false;
  }

  if (guest.checked_in) {
    return false; // Already checked in
  }

  // Update guest with check-in info
  const { error } = await supabase
    .from('guests')
    .update({
      checked_in: true,
      check_in_time: new Date().toISOString(),
      check_in_method: method,
      authorized_by: authorizedBy
    })
    .eq('id', guestId);

  if (error) {
    console.error('Error checking in guest:', error);
    return false;
  }

  return true;
};

// --- Reminders ---

export const getReminders = async (): Promise<Reminder[]> => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }

  return data.map(reminder => ({
    id: reminder.id,
    text: reminder.text,
    date: reminder.date,
    completed: reminder.completed
  }));
};

export const saveReminder = async (reminder: Reminder): Promise<void> => {
  const reminderData = {
    id: reminder.id,
    text: reminder.text,
    date: reminder.date,
    completed: reminder.completed
  };

  const { error } = await supabase
    .from('reminders')
    .upsert(reminderData, { onConflict: 'id' });

  if (error) {
    console.error('Error saving reminder:', error);
    throw error;
  }
};

export const deleteReminder = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting reminder:', error);
    throw error;
  }
};

export const toggleReminder = async (id: string): Promise<void> => {
  // First get current reminder
  const { data: reminder, error: fetchError } = await supabase
    .from('reminders')
    .select('completed')
    .eq('id', id)
    .single();

  if (fetchError || !reminder) {
    console.error('Error fetching reminder:', fetchError);
    throw fetchError;
  }

  // Toggle completed status
  const { error } = await supabase
    .from('reminders')
    .update({ completed: !reminder.completed })
    .eq('id', id);

  if (error) {
    console.error('Error toggling reminder:', error);
    throw error;
  }
};

// --- Users (Admins/Staff) ---

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data.map(user => ({
    id: user.id,
    name: user.name,
    role: user.role as 'ADMIN' | 'STAFF',
    contact: user.contact
  }));
};

export const saveUser = async (user: User): Promise<void> => {
  const userData = {
    id: user.id,
    name: user.name,
    role: user.role,
    contact: user.contact
  };

  const { error } = await supabase
    .from('users')
    .upsert(userData, { onConflict: 'id' });

  if (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
