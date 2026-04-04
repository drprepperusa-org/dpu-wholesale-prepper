import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

export function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

const BUCKET = 'products';

export async function uploadImage(file, filename) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  const { data, error } = await sb.storage
    .from(BUCKET)
    .upload(filename, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true
    });

  if (error) throw new Error(error.message);

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filename);
  return urlData.publicUrl;
}

export async function deleteImage(imageUrl) {
  const sb = getSupabase();
  if (!sb || !imageUrl) return;

  // Extract filename from Supabase URL
  const match = imageUrl.match(/\/storage\/v1\/object\/public\/products\/(.+)$/);
  if (!match) return; // Not a Supabase URL, skip

  const filepath = decodeURIComponent(match[1]);
  const { error } = await sb.storage.from(BUCKET).remove([filepath]);
  if (error) console.error('Failed to delete image:', error.message);
}
