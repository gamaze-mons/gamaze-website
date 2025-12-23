import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAppsScriptService } from '../services/googleSheets';

// Module-level cache for participants
let participantCache = null;

export default function ParticipantScreen() {
  const router = useRouter();
  const { gameName, gameId, scoringMethod, capturedTime } = useLocalSearchParams();
  const [participantName, setParticipantName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load participants from Google Sheets
  useEffect(() => {
    let isMounted = true;
    console.log('============= participants:cache', participantCache);
    // Show cached participants immediately if available
    if (participantCache) {
      setParticipants(participantCache);
      setFilteredParticipants(participantCache);
    }
    // Always fetch latest in background
    loadParticipants(isMounted);
    return () => { isMounted = false; };
  }, [gameName]);

  // Filter participants based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredParticipants(participants);
    } else {
      const filtered = participants.filter(participant =>
        participant.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredParticipants(filtered);
    }
  }, [searchQuery, participants]);

  const loadParticipants = async (isMounted = true) => {
    setIsLoading(true);
    try {
      console.log('Loading participants');
      console.log('Sending request to Google Apps Script...');
      // Send 'Global' as parameter, but Google Apps Script always uses 'Participants' sheet
      const result = await GoogleAppsScriptService.getParticipants('Participants');
      console.log('getParticipants result:', result);
      console.log('Result success:', result.success);
      console.log('Participants array:', result.participants);
      console.log('Participants count:', result.participants ? result.participants.length : 0);
      
      if (result.success && result.participants) {
        if (isMounted) {
          console.log('Found participants:', result.participants.length);
          setParticipants(result.participants);
          setFilteredParticipants(result.participants);
        }
        // Update cache
        participantCache = result.participants;
      } else {
        if (isMounted) {
          console.log('No participants found or error in response');
          console.log('Success flag:', result.success);
          console.log('Participants array:', result.participants);
          setParticipants([]);
          setFilteredParticipants([]);
        }
        participantCache = [];
      }
    } catch (error) {
      console.error('Error loading participants:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', 'Failed to load participants. Please try again.');
      if (isMounted) {
        setParticipants([]);
        setFilteredParticipants([]);
      }
      participantCache = [];
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleParticipantSelect = (participant) => {
    setParticipantName(participant.name);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleAddNewParticipant = async () => {
    if (!newParticipantName.trim()) {
      Alert.alert('Error', 'Please enter a participant name');
      return;
    }

    // Check if participant already exists locally
    const existingParticipant = participants.find(p => 
      p.name.toLowerCase() === newParticipantName.trim().toLowerCase()
    );

    if (existingParticipant) {
      Alert.alert('Duplicate Participant', 'This participant already exists. Please select from the list or use a different name.');
      return;
    }

    try {
      const result = await GoogleAppsScriptService.addParticipant('Participants', newParticipantName.trim(), null);
      if (result.success) {
        // Add to local list
        const newParticipant = { name: newParticipantName.trim() };
        // Update local state and cache immediately
        setParticipants(prev => {
          const updated = [...prev, newParticipant];
          participantCache = updated;
          return updated;
        });
        setFilteredParticipants(prev => {
          const updated = [...prev, newParticipant];
          participantCache = updated;
          return updated;
        });
        setParticipantName(newParticipantName.trim());
        setNewParticipantName('');
        setShowAddModal(false);
        Alert.alert('Success', 'Participant added successfully!');
      }
    } catch (error) {
      console.error('Error adding participant:', error);
      Alert.alert('Error', 'Failed to add participant. Please try again.');
    }
  };

  const handleContinue = async () => {
    if (!participantName.trim()) {
      Alert.alert('Error', 'Please select or enter a participant name');
      return;
    }

    // For timeRace, submit the score directly with time first, then participant
    if (scoringMethod === 'timeRace' && capturedTime) {
      setIsSubmitting(true);
      try {
        // Submit with time as the score and participant name
        await GoogleAppsScriptService.addScore(gameName, participantName.trim(), capturedTime);
        
        Alert.alert(
          'Success!', 
          `Race time submitted successfully!\n\nGame: ${gameName}\nParticipant: ${participantName.trim()}\nTime: ${capturedTime}`,
          [
            {
              text: 'Submit Another Time',
              onPress: () => {
                router.push({
                  pathname: '/scoring',
                  params: { 
                    gameName: gameName, 
                    gameId: gameId,
                    scoringMethod: scoringMethod
                  }
                });
              }
            },
            {
              text: 'Back to Games',
              onPress: () => {
                router.push('/');
              }
            }
          ]
        );
      } catch (error) {
        console.error('Submission error:', error);
        Alert.alert(
          'Error', 
          `Failed to submit race time: ${error.message}`,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setIsSubmitting(false);
              }
            },
            {
              text: 'Back to Games',
              onPress: () => {
                router.push('/');
              }
            }
          ]
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // For other games, navigate to scoring screen
    router.push({
      pathname: '/scoring',
      params: { 
        gameName: gameName, 
        gameId: gameId, 
        participantName: participantName.trim(),
        scoringMethod: scoringMethod
      }
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Participant</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.gameInfo}>
            <Text style={styles.gameName}>{gameName}</Text>
            <Text style={styles.gameSubtitle}>
              {scoringMethod === 'timeRace' && capturedTime 
                ? `Select participant for time: ${capturedTime}`
                : 'Select or Add Participant'
              }
            </Text>
            {scoringMethod === 'timeRace' && capturedTime && (
              <View style={styles.capturedTimeContainer}>
                <Text style={styles.capturedTimeLabel}>Captured Time:</Text>
                <Text style={styles.capturedTimeValue}>{capturedTime}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Participant Name</Text>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search participants..."
                placeholderTextColor="#999"
                onFocus={() => setShowDropdown(true)}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {showDropdown && (
              <View style={styles.dropdownContainer}>
                <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((participant, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => handleParticipantSelect(participant)}
                      >
                        <View style={styles.dropdownItemContent}>
                          {participant.photoUrl && (
                            <Image source={{ uri: participant.photoUrl }} style={styles.dropdownItemImage} />
                          )}
                          <Text style={styles.dropdownItemText}>{participant.name}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : isLoading ? (
                    <Text style={styles.loadingText}>Loading participants...</Text>
                  ) : (
                    <Text style={styles.noResultsText}>
                      {participants.length === 0 
                        ? 'No participants registered yet. Tap + to add participants.'
                        : 'No participants match your search. Try a different search term.'
                      }
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}

            {participantName && (
              <View style={styles.selectedParticipant}>
                <Text style={styles.selectedLabel}>Selected:</Text>
                <View style={styles.selectedParticipantContent}>
                  {participants.find(p => p.name === participantName)?.photoUrl && (
                    <Image 
                      source={{ uri: participants.find(p => p.name === participantName)?.photoUrl }} 
                      style={styles.selectedParticipantImage} 
                    />
                  )}
                  <Text style={styles.selectedName}>{participantName}</Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !participantName.trim() && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!participantName.trim() || isSubmitting}
          >
            <Text style={styles.continueButtonText}>
              {isSubmitting 
                ? 'Submitting...' 
                : scoringMethod === 'timeRace' 
                  ? 'Submit Race Time' 
                  : 'Continue to Scoring'
              }
            </Text>
            {!isSubmitting && (
              <Ionicons 
                name={scoringMethod === 'timeRace' ? 'checkmark' : 'arrow-forward'} 
                size={20} 
                color="#fff" 
              />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add New Participant Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Participant</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newParticipantName}
              onChangeText={setNewParticipantName}
              placeholder="Enter participant name"
              placeholderTextColor="#999"
              autoFocus={true}
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewParticipantName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !newParticipantName.trim() && styles.saveButtonDisabled
                ]}
                onPress={handleAddNewParticipant}
                disabled={!newParticipantName.trim()}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 30,
  },
  gameName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  gameSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  capturedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
  },
  capturedTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginRight: 8,
  },
  capturedTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  addButton: {
    padding: 8,
    marginLeft: 12,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
  },
  dropdownList: {
    padding: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  loadingText: {
    padding: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  noResultsText: {
    padding: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  selectedParticipant: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginRight: 8,
  },
  selectedParticipantContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedParticipantImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
}); 