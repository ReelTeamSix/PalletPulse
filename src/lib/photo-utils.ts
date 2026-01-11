// Photo Utilities - Picking, compressing, and uploading images
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { supabase } from './supabase';

// Configuration for image compression
const COMPRESSION_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.7, // 70% quality - good balance between size and quality
};

// Storage bucket name
const STORAGE_BUCKET = 'item-photos';

export interface PhotoPickResult {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Pick an image from the camera
 */
export async function pickImageFromCamera(): Promise<PhotoPickResult | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: COMPRESSION_CONFIG.quality,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
  };
}

/**
 * Pick an image from the gallery
 */
export async function pickImageFromGallery(): Promise<PhotoPickResult | null> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: COMPRESSION_CONFIG.quality,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
  };
}

/**
 * Pick multiple images from the gallery
 */
export async function pickMultipleImagesFromGallery(
  maxCount: number = 5
): Promise<PhotoPickResult[]> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maxCount,
    quality: COMPRESSION_CONFIG.quality,
  });

  if (result.canceled || !result.assets?.length) {
    return [];
  }

  return result.assets.map((asset) => ({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
  }));
}

/**
 * Get image dimensions
 */
export function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateResizedDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > height) {
    const newWidth = Math.min(width, maxWidth);
    return { width: newWidth, height: Math.round(newWidth / aspectRatio) };
  } else {
    const newHeight = Math.min(height, maxHeight);
    return { width: Math.round(newHeight * aspectRatio), height: newHeight };
  }
}

/**
 * Convert image URI to blob for upload
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

/**
 * Generate a unique storage path for an image
 */
function generateStoragePath(userId: string, itemId: string, fileName: string): string {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop() || 'jpg';
  return `${userId}/${itemId}/${timestamp}.${extension}`;
}

/**
 * Upload a photo to Supabase Storage with compression
 * The image is already compressed during picking via expo-image-picker quality setting
 */
export async function uploadItemPhoto(
  photo: PhotoPickResult,
  userId: string,
  itemId: string
): Promise<UploadResult> {
  try {
    // Generate storage path
    const storagePath = generateStoragePath(userId, itemId, photo.fileName ?? 'photo.jpg');

    // Convert to blob
    const blob = await uriToBlob(photo.uri);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, {
        contentType: photo.type ?? 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return {
      success: true,
      path: storagePath,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload photo';
    return { success: false, error: message };
  }
}

/**
 * Delete a photo from Supabase Storage
 */
export async function deletePhoto(storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete photo';
    return { success: false, error: message };
  }
}

/**
 * Get public URL for a storage path
 */
export function getPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Estimate compressed file size (rough estimate)
 * Helps users understand the storage impact
 */
export function estimateCompressedSize(width: number, height: number): number {
  // Rough estimate: compressed JPEG is about 0.5-1 byte per pixel at 70% quality
  const pixels = width * height;
  const { width: newWidth, height: newHeight } = calculateResizedDimensions(
    width,
    height,
    COMPRESSION_CONFIG.maxWidth,
    COMPRESSION_CONFIG.maxHeight
  );
  const resizedPixels = newWidth * newHeight;
  const bytesPerPixel = 0.7; // Conservative estimate for compressed JPEG
  return Math.round(resizedPixels * bytesPerPixel * COMPRESSION_CONFIG.quality);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
