import { supabase } from './supabaseService';

const BUCKET_NAME = 'event-images';

const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob conversion failed'));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const uploadEventImage = async (file: File): Promise<string> => {
  const fileExt = 'jpg'; // We convert to jpeg for compression
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `events/${fileName}`;

  // Compress before upload
  const compressedBlob = await compressImage(file);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, compressedBlob, {
       contentType: 'image/jpeg'
    });

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
