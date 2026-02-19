import { supabase } from './supabaseService';

const BUCKET_NAME = 'event-images';

export const uploadEventImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `events/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const deleteEventImage = async (url: string): Promise<void> => {
  try {
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    
    if (folder === 'events') {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([`events/${fileName}`]);
        
      if (error) console.error('Error deleting image from storage:', error);
    }
  } catch (e) {
    console.error('Failed to parse URL for deletion:', e);
  }
};
