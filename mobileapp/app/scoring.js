import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAppsScriptService } from '../services/googleSheets';

export default function ScoringScreen() {
  const router = useRouter();
  const { gameName, gameId, participantName, scoringMethod } = useLocalSearchParams();
  const [score, setScore] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Circle Circle game state
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointInput, setPointInput] = useState('');
  const [pointHistory, setPointHistory] = useState([]);
  
  // Fishing game state
  const [fishingTimeLimit, setFishingTimeLimit] = useState(120); // 2 minutes default
  const [isFishingTimerRunning, setIsFishingTimerRunning] = useState(false);
  const [fishingTimeRemaining, setFishingTimeRemaining] = useState(120);
  const [fishingTimerDisplay, setFishingTimerDisplay] = useState('02:00');
  const fishingIntervalRef = useRef(null);
  
  // Stopwatch state
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchDisplay, setStopwatchDisplay] = useState('00:00');
  const intervalRef = useRef(null);

  // Timer and Points state
  const [timerAndPointsTime, setTimerAndPointsTime] = useState(0);
  const [timerAndPointsDisplay, setTimerAndPointsDisplay] = useState('00:00');
  const [isTimerAndPointsRunning, setIsTimerAndPointsRunning] = useState(false);
  const [timerAndPointsPoints, setTimerAndPointsPoints] = useState('');
  const [timerAndPointsTimeTaken, setTimerAndPointsTimeTaken] = useState(0);
  const [timerAndPointsPointsScored, setTimerAndPointsPointsScored] = useState(0);
  const timerAndPointsIntervalRef = useRef(null);

  // Circle Circle functions
  const addPoint = () => {
    const pointValue = parseFloat(pointInput);
    if (!isNaN(pointValue) && pointValue >= 0) {
      const newTotal = totalPoints + pointValue;
      setTotalPoints(newTotal);
      setScore(newTotal.toString());
      setPointHistory([...pointHistory, pointValue]);
      setPointInput('');
    }
  };

  const resetCircleCircle = () => {
    setTotalPoints(0);
    setScore('');
    setPointHistory([]);
    setPointInput('');
  };

  // Fishing game functions
  const startFishingTimer = () => {
    setIsFishingTimerRunning(true);
    setFishingTimeRemaining(fishingTimeLimit);
    setFishingTimerDisplay(formatTime(fishingTimeLimit));
    
    fishingIntervalRef.current = setInterval(() => {
      setFishingTimeRemaining(prevTime => {
        const newTime = prevTime - 1;
        setFishingTimerDisplay(formatTime(newTime));
        
        if (newTime <= 0) {
          setIsFishingTimerRunning(false);
          clearInterval(fishingIntervalRef.current);
          fishingIntervalRef.current = null;
          Alert.alert('Time\'s Up!', 'Fishing time has ended. Submit your score!');
        }
        
        return newTime;
      });
    }, 1000);
  };

  const stopFishingTimer = () => {
    setIsFishingTimerRunning(false);
    if (fishingIntervalRef.current) {
      clearInterval(fishingIntervalRef.current);
      fishingIntervalRef.current = null;
    }
  };

  const resetFishingTimer = () => {
    setIsFishingTimerRunning(false);
    setFishingTimeRemaining(fishingTimeLimit);
    setFishingTimerDisplay(formatTime(fishingTimeLimit));
    setScore('');
    if (fishingIntervalRef.current) {
      clearInterval(fishingIntervalRef.current);
      fishingIntervalRef.current = null;
    }
  };

  const changeFishingTimeLimit = (minutes) => {
    const seconds = minutes * 60;
    setFishingTimeLimit(seconds);
    setFishingTimeRemaining(seconds);
    setFishingTimerDisplay(formatTime(seconds));
  };

  // Stopwatch functions
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startStopwatch = () => {
    setIsStopwatchRunning(true);
    intervalRef.current = setInterval(() => {
      setStopwatchTime(prevTime => {
        const newTime = prevTime + 1;
        setStopwatchDisplay(formatTime(newTime));
        return newTime;
      });
    }, 1000);
  };

  const stopStopwatch = () => {
    setIsStopwatchRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Set the score to the formatted time (MM:SS)
    setScore(stopwatchDisplay);
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
    setStopwatchDisplay('00:00');
    setScore('');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Timer and Points functions
  const startTimerAndPoints = () => {
    setIsTimerAndPointsRunning(true);
    setTimerAndPointsTime(0);
    setTimerAndPointsDisplay('00:00');
    
    timerAndPointsIntervalRef.current = setInterval(() => {
      setTimerAndPointsTime(prevTime => {
        const newTime = prevTime + 1;
        setTimerAndPointsDisplay(formatTime(newTime));
        return newTime;
      });
    }, 1000);
  };

  const stopTimerAndPoints = () => {
    setIsTimerAndPointsRunning(false);
    if (timerAndPointsIntervalRef.current) {
      clearInterval(timerAndPointsIntervalRef.current);
      timerAndPointsIntervalRef.current = null;
    }
  };

  const resetTimerAndPoints = () => {
    setIsTimerAndPointsRunning(false);
    setTimerAndPointsTime(0);
    setTimerAndPointsDisplay('00:00');
    setTimerAndPointsPoints('');
    setScore('');
    if (timerAndPointsIntervalRef.current) {
      clearInterval(timerAndPointsIntervalRef.current);
      timerAndPointsIntervalRef.current = null;
    }
  };

  const handleTimerAndPointsSubmit = () => {
    if (!timerAndPointsPoints.trim()) {
      Alert.alert('Error', 'Please enter the points scored');
      return;
    }
    
    const pointsValue = parseFloat(timerAndPointsPoints);
    if (isNaN(pointsValue) || pointsValue < 0) {
      Alert.alert('Error', 'Please enter a valid number of points');
      return;
    }
    
    // Store formatted time and points separately
    setTimerAndPointsTimeTaken(timerAndPointsDisplay);
    setTimerAndPointsPointsScored(pointsValue);
    
    // Create a formatted score for display and database
    const formattedScore = `${timerAndPointsDisplay} - ${pointsValue}pts`;
    setScore(formattedScore);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timerAndPointsIntervalRef.current) {
        clearInterval(timerAndPointsIntervalRef.current);
      }
    };
  }, []);

  const getScoringMethodLabel = (method) => {
    switch (method) {
      case 'points':
        return 'Points';
      case 'multiplePoints':
        return 'Multiple Points';
      case 'stopwatch':
        return 'Time (MM:SS)';
      case 'timeRace':
        return 'Race Time (MM:SS)';
      case 'timerAndPoints':
        return 'Timer & Points';
      default:
        return 'Score';
    }
  };

  const getPlaceholder = (method) => {
    switch (method) {
      case 'points':
        return 'Enter points scored';
      case 'multiplePoints':
        return 'Use multiple points input below';
      case 'stopwatch':
        return 'Use stopwatch below';
      case 'timeRace':
        return 'Use stopwatch below, then select participant';
      case 'timerAndPoints':
        return 'Use timer below, then enter points';
      default:
        return 'Enter score';
    }
  };

  const validateScore = (value, method) => {
    switch (method) {
      case 'points':
        const numValue = parseFloat(value);
        return !isNaN(numValue) && numValue >= 0;
      case 'multiplePoints':
        const multiplePointsValue = parseFloat(value);
        return !isNaN(multiplePointsValue) && multiplePointsValue >= 0;
      case 'stopwatch':
        // For stopwatch, validate MM:SS format
        const timeRegex = /^\d{2}:\d{2}$/;
        return timeRegex.test(value);
      case 'timeRace':
        // For timing race, validate MM:SS format
        const raceTimeRegex = /^\d{2}:\d{2}$/;
        return raceTimeRegex.test(value);
      case 'timerAndPoints':
        // For timer and points, we need both time and points
        const timerPointsValue = parseFloat(value);
        return !isNaN(timerPointsValue) && timerPointsValue >= 0;
      default:
        return true;
    }
  };

  const testApiConnection = async () => {
    setIsTesting(true);
    try {
      // Test with the Google Apps Script service
      const result = await GoogleAppsScriptService.addScore('Test', '100', null, 'Test User');
      
      if (result.success) {
        Alert.alert('Success!', 'Google Apps Script connection is working correctly.\n\nScore was successfully added to the spreadsheet.');
      } else {
        Alert.alert('Error', 'Connection test failed: Apps Script did not return success status.');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      Alert.alert(
        'Error', 
        `Connection test failed: ${error.message}\n\nPlease check:\n1. Your Google Apps Script is deployed as a web app\n2. The SCRIPT_URL in services/googleSheets.js is correct\n3. The spreadsheet ID in your Apps Script is correct`
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!score.trim()) {
      Alert.alert('Error', `Please enter a ${getScoringMethodLabel(scoringMethod).toLowerCase()}`);
      return;
    }

    if (!validateScore(score, scoringMethod)) {
      Alert.alert('Error', `Please enter a valid ${getScoringMethodLabel(scoringMethod).toLowerCase()}`);
      return;
    }

    // For timing_race, capture time first, then navigate to participant selection
    if (scoringMethod === 'timeRace') {
      // Store the time and navigate to participant selection
      router.push({
        pathname: '/participant',
        params: {
          gameName: gameName,
          gameId: gameId,
          scoringMethod: scoringMethod,
          capturedTime: score
        }
      });
      return;
    }

    // For timerAndPoints, capture time and points first, then navigate to participant selection
    if (scoringMethod === 'timerAndPoints') {
      router.push({
        pathname: '/participant',
        params: {
          gameName: gameName,
          gameId: gameId,
          scoringMethod: scoringMethod,
          capturedTime: timerAndPointsTimeTaken,
          capturedPoints: timerAndPointsPointsScored
        }
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // For timerAndPoints, send separate time and points values
      if (scoringMethod === 'timerAndPoints') {
        console.log('=== SCORE SUBMISSION (timerAndPoints) ===');
        console.log('Game:', gameName);
        console.log('Participant:', participantName);
        console.log('Time Taken:', timerAndPointsTimeTaken);
        console.log('Points Scored:', timerAndPointsPointsScored);
        console.log('Scoring Method:', scoringMethod);
        console.log('=========================================');
        await GoogleAppsScriptService.addScore(gameName, timerAndPointsTimeTaken, timerAndPointsPointsScored, participantName);
      } else {
        // For other games, send regular score
        console.log('=== SCORE SUBMISSION ===');
        console.log('Game:', gameName);
        console.log('Participant:', participantName);
        console.log('Score:', score);
        console.log('Scoring Method:', scoringMethod);
        console.log('========================');
        await GoogleAppsScriptService.addScore(gameName, score, null, participantName);
      }
      
      Alert.alert(
        'Success!', 
        `Score submitted successfully!\n\nGame: ${gameName}\nParticipant: ${participantName}\n${getScoringMethodLabel(scoringMethod)}: ${score}`,
        [
          {
            text: 'Submit Another Score',
            onPress: () => {
              setScore('');
              resetStopwatch();
              resetTimerAndPoints();
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
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        'Error', 
        `Failed to submit score: ${error.message}\n\nPlease check your Google Apps Script configuration.`,
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
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Render stopwatch component
  const renderStopwatch = () => {
    if (scoringMethod !== 'stopwatch' && scoringMethod !== 'timeRace') return null;

    return (
      <View style={styles.stopwatchContainer}>
        <Text style={styles.stopwatchLabel}>
          {scoringMethod === 'timeRace' ? 'Race Timer' : 'Stopwatch'}
        </Text>
        <Text style={styles.stopwatchDisplay}>{stopwatchDisplay}</Text>
        <View style={styles.stopwatchButtons}>
          {!isStopwatchRunning ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startStopwatch}
            >
              <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopStopwatch}
            >
              <Ionicons name="stop" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetStopwatch}
          >
            <Ionicons name="refresh" size={16} color="#FF3B30" style={{ marginRight: 8 }} />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
        {score && (
          <Text style={styles.timeCaptured}>
            {scoringMethod === 'timeRace' ? 'Race time captured' : 'Time captured'}: {score}
          </Text>
        )}
      </View>
    );
  };

  // Render Circle Circle component
  const renderCircleCircle = () => {
    if (scoringMethod !== 'multiplePoints') return null;

    return (
      <View style={styles.circleCircleContainer}>
        <Text style={styles.circleCircleLabel}>Add Points</Text>
        <Text style={styles.totalPointsDisplay}>Total Points: {totalPoints}</Text>
        
        <View style={styles.pointInputContainer}>
          <TextInput
            style={styles.pointInput}
            value={pointInput}
            onChangeText={setPointInput}
            placeholder="Enter points to add"
            placeholderTextColor="#999"
            keyboardType="numeric"
            autoFocus={true}
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              !pointInput.trim() && styles.addButtonDisabled
            ]}
            onPress={addPoint}
            disabled={!pointInput.trim()}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {pointHistory.length > 0 && (
          <View style={styles.pointHistoryContainer}>
            <Text style={styles.pointHistoryLabel}>Point History:</Text>
            <Text style={styles.pointHistoryText}>
              {pointHistory.join(' + ')} = {totalPoints}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.resetCircleButton}
          onPress={resetCircleCircle}
        >
          <Ionicons name="refresh" size={16} color="#FF3B30" style={{ marginRight: 8 }} />
          <Text style={styles.resetCircleButtonText}>Reset Points</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render Timer and Points component
  const renderTimerAndPoints = () => {
    if (scoringMethod !== 'timerAndPoints') return null;

    return (
      <View style={styles.timerAndPointsContainer}>
        <Text style={styles.timerAndPointsLabel}>Timer & Points</Text>
        <Text style={styles.timerDisplay}>{timerAndPointsDisplay}</Text>
        
        <View style={styles.timerButtons}>
          {!isTimerAndPointsRunning ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startTimerAndPoints}
            >
              <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.startButtonText}>Start Timer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopTimerAndPoints}
            >
              <Ionicons name="stop" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.stopButtonText}>Stop Timer</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetTimerAndPoints}
          >
            <Ionicons name="refresh" size={16} color="#FF3B30" style={{ marginRight: 8 }} />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {!isTimerAndPointsRunning && timerAndPointsTime > 0 && (
          <View style={styles.pointsInputContainer}>
            <Text style={styles.pointsLabel}>Points Scored:</Text>
            <TextInput
              style={styles.pointsInput}
              value={timerAndPointsPoints}
              onChangeText={setTimerAndPointsPoints}
              placeholder="Enter points scored"
              placeholderTextColor="#999"
              keyboardType="numeric"
              autoFocus={true}
            />
            <TouchableOpacity
              style={[
                styles.pointsSubmitButton,
                !timerAndPointsPoints.trim() && styles.pointsSubmitButtonDisabled
              ]}
              onPress={handleTimerAndPointsSubmit}
              disabled={!timerAndPointsPoints.trim()}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {score && (
          <Text style={styles.scoreCaptured}>
            Score captured: {score}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Score</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>{gameName}</Text>
          <Text style={styles.participantName}>Participant: {participantName}</Text>
          <Text style={styles.scoringMethodLabel}>
            Scoring Method: {getScoringMethodLabel(scoringMethod)}
          </Text>
        </View>

        {scoringMethod === 'multiplePoints' ? (
          <>
            {renderCircleCircle()}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!score.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!score.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Score</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : scoringMethod === 'stopwatch' || scoringMethod === 'timeRace' ? (
          <>
            {renderStopwatch()}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!score.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!score.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {scoringMethod === 'timeRace' ? 'Capture Race Time' : 'Submit Score'}
                  </Text>
                  <Ionicons name="checkmark" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : scoringMethod === 'timerAndPoints' ? (
          <>
            {renderTimerAndPoints()}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!score.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!score.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Score</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{getScoringMethodLabel(scoringMethod)}</Text>
              <TextInput
                style={styles.input}
                value={score}
                onChangeText={setScore}
                placeholder={getPlaceholder(scoringMethod)}
                placeholderTextColor="#999"
                keyboardType={scoringMethod === 'points' ? 'numeric' : 'default'}
                autoFocus={true}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!score.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!score.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Score</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Remove the Test Apps Script Connection button, info box, and warning box */}
        {/* <TouchableOpacity style={styles.testButton} onPress={testApiConnection} disabled={isTesting}>...</TouchableOpacity> */}
        {/* <View style={styles.infoBox}>...</View> */}
        {/* <View style={styles.warningBox}>...</View> */}
      </View>
    </View>
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
  participantName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  scoringMethodLabel: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stopwatchContainer: {
    marginBottom: 30,
  },
  stopwatchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stopwatchDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  stopwatchButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  startButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
    flex: 1,
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  timeCaptured: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  circleCircleContainer: {
    marginBottom: 30,
  },
  circleCircleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  totalPointsDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  pointInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pointInput: {
    flex: 1,
    fontSize: 18,
    paddingRight: 10,
  },
  addButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  pointHistoryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 16,
  },
  pointHistoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pointHistoryText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resetCircleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginTop: 16,
  },
  resetCircleButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  timerAndPointsContainer: {
    marginBottom: 30,
  },
  timerAndPointsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  timerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  pointsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  pointsInput: {
    flex: 1,
    fontSize: 18,
    paddingRight: 10,
  },
  pointsSubmitButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsSubmitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  scoreCaptured: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 