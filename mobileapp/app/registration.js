import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { GoogleAppsScriptService } from '../services/googleSheets';

export default function RegistrationScreen() {
  const router = useRouter();
  const { gameName, gameId } = useLocalSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize with 4 empty participant rows
  const [participants, setParticipants] = useState([
    { id: 1, name: '', photo: null, photoUri: null },
    { id: 2, name: '', photo: null, photoUri: null },
    { id: 3, name: '', photo: null, photoUri: null },
    { id: 4, name: '', photo: null, photoUri: null },
  ]);

  const takePhoto = async (participantId) => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      // Launch camera with correct API for current expo-image-picker version
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Update participant with photo
        setParticipants(prev => 
          prev.map(p => 
            p.id === participantId 
              ? { ...p, photo: photoUri, photoUri: photoUri }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const updateParticipantName = (participantId, name) => {
    setParticipants(prev => 
      prev.map(p => 
        p.id === participantId 
          ? { ...p, name: name }
          : p
      )
    );
  };

  const deleteParticipant = (participantId) => {
    if (participants.length <= 1) {
      Alert.alert('Cannot delete', 'At least one participant is required.');
      return;
    }
    
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  const addParticipant = () => {
    const newId = Math.max(...participants.map(p => p.id)) + 1;
    setParticipants(prev => [...prev, { 
      id: newId, 
      name: '', 
      photo: null, 
      photoUri: null 
    }]);
  };

  const validateParticipants = () => {
    const validParticipants = participants.filter(p => p.name.trim() !== '');
    if (validParticipants.length === 0) {
      Alert.alert('Error', 'Please enter at least one participant name.');
      return false;
    }
    return true;
  };

  const uploadPhotoToDrive = async (photoUri, participantName) => {
    try {
      console.log('Uploading photo for participant:', participantName);
      console.log('Photo URI:', photoUri);
      
      // For now, we'll use the original approach but with better error handling
      // In the future, we can implement true direct upload with Google Drive API
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      // Convert blob to base64 using FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64Data = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
            console.log('Photo converted to base64, length:', base64Data.length);
            resolve(base64Data);
          } catch (error) {
            console.error('Error processing base64:', error);
            reject(error);
          }
        };
        
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(error);
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!validateParticipants()) return;

    setIsSubmitting(true);

    try {
      const validParticipants = participants.filter(p => p.name.trim() !== '');
      
      // Process each participant
      for (const participant of validParticipants) {
        let photoUrl = null;
        
        // Upload photo if exists
        if (participant.photoUri) {
          photoUrl = await uploadPhotoToDrive(participant.photoUri, participant.name);
        }

        // Save to Google Sheets
        await GoogleAppsScriptService.addParticipant(
          'Participants', 
          participant.name.trim(), 
          photoUrl
        );
      }

      Alert.alert(
        'Success!', 
        `Registered ${validParticipants.length} participant(s) to global list`,
        [
          {
            text: 'Back to Games',
            onPress: () => {
              router.push('/');
            }
          },
          {
            text: 'Add More',
            onPress: () => {
              // Reset form
              setParticipants([
                { id: 1, name: '', photo: null, photoUri: null },
                { id: 2, name: '', photo: null, photoUri: null },
                { id: 3, name: '', photo: null, photoUri: null },
                { id: 4, name: '', photo: null, photoUri: null },
              ]);
              setIsSubmitting(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to save participants. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Participants</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Participants</Text>
          <Text style={styles.subtitle}>Manage all participants for all games</Text>
        </View>

        <ScrollView 
          style={styles.participantsList} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantRow}>
              <View style={styles.participantInput}>
                <TextInput
                  style={styles.nameInput}
                  value={participant.name}
                  onChangeText={(name) => updateParticipantName(participant.id, name)}
                  placeholder="Enter participant name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
                
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto(participant.id)}
                >
                  {participant.photo ? (
                    <Image source={{ uri: participant.photo }} style={styles.photoPreview} />
                  ) : (
                    <Ionicons name="camera" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteParticipant(participant.id)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.addButton} onPress={addParticipant}>
          <Ionicons name="add-circle" size={20} color="#007AFF" style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>Add Participant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            isSubmitting && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save All Participants</Text>
              <Ionicons name="checkmark" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  gameInfo: {
    marginBottom: 20,
  },
  gameName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  participantsList: {
    flex: 1,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 20, // Add some padding at the bottom to prevent content from being hidden behind keyboard
  },
  participantRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  participantInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginRight: 12,
  },
  photoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  deleteButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 