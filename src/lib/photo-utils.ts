// Photo Utilities - Picking, compressing, and uploading images
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
import { supabase } from './supabase';

// Configuration for image compression
// Aggressive compression to minimize storage costs on free tier
// 800px is plenty for inventory photos (phones display at ~400px width)
// 50% JPEG quality is still very readable for product identification
const COMPRESSION_CONFIG = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.5, // 50% quality - optimized for storage, still clear for inventory
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
    allowsEditing: false, // Don't force crop - let users keep full image
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
    allowsEditing: false, // Don't force crop - let users keep full image
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
 * Exported for testing
 */
export function calculateResizedDimensions(
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
 * Compress and resize an image before upload
 * This is the key function for reducing storage costs
 */
export async function compressImage(uri: string): Promise<string> {
  try {
    // Get original dimensions to calculate proper resize
    const dimensions = await getImageDimensions(uri);
    const { width: targetWidth, height: targetHeight } = calculateResizedDimensions(
      dimensions.width,
      dimensions.height,
      COMPRESSION_CONFIG.maxWidth,
      COMPRESSION_CONFIG.maxHeight
    );

    // Resize and compress
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: targetWidth, height: targetHeight } }],
      {
        compress: COMPRESSION_CONFIG.quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    // If compression fails, return original URI
    console.warn('Image compression failed, using original:', error);
    return uri;
  }
}

/**
 * Convert image URI to ArrayBuffer for upload (React Native/Expo compatible)
 */
async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

/**
 * Generate a unique storage path for an image
 * Exported for testing
 */
export function generateStoragePath(userId: string, itemId: string, fileName: string): string {
  const timestamp = Date.now();
  // Only use extension if filename contains a dot, otherwise default to jpg
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
  return `${userId}/${itemId}/${timestamp}.${extension}`;
}

/**
 * Upload a photo to Supabase Storage with compression
 * Images are resized to max 800x800 and compressed to 50% JPEG quality
 * Typical result: 50-120KB per photo (vs 2-5MB raw from camera)
 */
export async function uploadItemPhoto(
  photo: PhotoPickResult,
  userId: string,
  itemId: string
): Promise<UploadResult> {
  try {
    // Generate storage path
    const storagePath = generateStoragePath(userId, itemId, photo.fileName ?? 'photo.jpg');

    // Compress and resize image before upload
    const compressedUri = await compressImage(photo.uri);

    // Convert to ArrayBuffer (React Native/Expo compatible)
    const arrayBuffer = await uriToArrayBuffer(compressedUri);

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
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
  // Rough estimate: compressed JPEG at 50% quality, 800px max
  // Typical result: 50-120KB per photo (vs 200-400KB at previous settings)
  const { width: newWidth, height: newHeight } = calculateResizedDimensions(
    width,
    height,
    COMPRESSION_CONFIG.maxWidth,
    COMPRESSION_CONFIG.maxHeight
  );
  const resizedPixels = newWidth * newHeight;
  const bytesPerPixel = 0.4; // Conservative estimate for 50% quality JPEG
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
