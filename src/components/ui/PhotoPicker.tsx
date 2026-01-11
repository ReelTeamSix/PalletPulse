// PhotoPicker Component - For selecting and displaying item photos
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  PhotoPickResult,
  pickImageFromCamera,
  pickImageFromGallery,
  getPhotoUrl,
} from '@/src/lib/photo-utils';

export interface PhotoItem {
  id: string;
  uri: string; // Local URI or public URL
  storagePath?: string; // If already uploaded
  isUploading?: boolean;
  isNew?: boolean; // New photo to be uploaded
}

interface PhotoPickerProps {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  onPhotoPress?: (photo: PhotoItem, index: number) => void;
}

export function PhotoPicker({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
  onPhotoPress,
}: PhotoPickerProps) {
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const canAddMore = photos.length < maxPhotos;

  const handleAddPhoto = () => {
    if (!canAddMore || disabled) return;
    setShowSourcePicker(true);
  };

  const handlePickFromCamera = async () => {
    setShowSourcePicker(false);
    setIsProcessing(true);

    try {
      const result = await pickImageFromCamera();
      if (result) {
        addPhotoFromResult(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    setShowSourcePicker(false);
    setIsProcessing(true);

    try {
      const result = await pickImageFromGallery();
      if (result) {
        addPhotoFromResult(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const addPhotoFromResult = (result: PhotoPickResult) => {
    const newPhoto: PhotoItem = {
      id: `new_${Date.now()}`,
      uri: result.uri,
      isNew: true,
    };
    onPhotosChange([...photos, newPhoto]);
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...photos];
            newPhotos.splice(index, 1);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  const handlePhotoPress = (photo: PhotoItem, index: number) => {
    if (onPhotoPress) {
      onPhotoPress(photo, index);
    } else {
      // Default: show remove option
      handleRemovePhoto(index);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {photos.map((photo, index) => (
          <Pressable
            key={photo.id}
            style={styles.photoContainer}
            onPress={() => handlePhotoPress(photo, index)}
            disabled={disabled}
          >
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            {photo.isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color={colors.background} />
              </View>
            )}
            {!disabled && (
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
              >
                <FontAwesome name="times" size={12} color={colors.background} />
              </Pressable>
            )}
            <View style={styles.photoNumber}>
              <Text style={styles.photoNumberText}>{index + 1}</Text>
            </View>
          </Pressable>
        ))}

        {canAddMore && !disabled && (
          <Pressable
            style={[styles.addButton, isProcessing && styles.addButtonDisabled]}
            onPress={handleAddPhoto}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <>
                <FontAwesome name="camera" size={24} color={colors.textSecondary} />
                <Text style={styles.addButtonText}>
                  Add Photo
                </Text>
                <Text style={styles.photoCount}>
                  {photos.length}/{maxPhotos}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {!canAddMore && (
          <View style={styles.limitReached}>
            <FontAwesome name="check-circle" size={20} color={colors.profit} />
            <Text style={styles.limitText}>
              Max {maxPhotos} photos
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Source Picker Modal */}
      <Modal
        visible={showSourcePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSourcePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSourcePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Photo</Text>

            <Pressable style={styles.modalOption} onPress={handlePickFromCamera}>
              <FontAwesome name="camera" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </Pressable>

            <Pressable style={styles.modalOption} onPress={handlePickFromGallery}>
              <FontAwesome name="image" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </Pressable>

            <Pressable
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowSourcePicker(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.loss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumber: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumberText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '600',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  photoCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  limitReached: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  limitText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  modalOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  cancelOption: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
});
