import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAppsScriptService } from '../services/googleSheets';

// Fallback games if Google Sheets fetch fails
const fallbackGames = [
  {
    id: 1,
    name: 'Circle Circus',
    description: 'Points with addition - Keep adding points',
    scoringMethod: 'multiplePoints'
  },
  {
    id: 2,
    name: 'Colour Mania',
    description: 'Timing-based game',
    scoringMethod: 'stopwatch'
  },
  {
    id: 3,
    name: 'Hole in the Wall',
    description: 'Timing-based game',
    scoringMethod: 'stopwatch'
  },
  {
    id: 4,
    name: 'Turbo Racing',
    description: 'Racing game - Record completion time, then select participant',
    scoringMethod: 'timeRace'
  },
  {
    id: 5,
    name: 'Fishing',
    description: 'Count fishes caught within 2 or 4 minutes',
    scoringMethod: 'points'
  },
  {
    id: 6,
    name: 'The Maze',
    description: 'Navigate through the maze - timing-based',
    scoringMethod: 'stopwatch'
  },
  {
    id: 7,
    name: 'Corn Hole',
    description: 'Toss bean bags into holes - points-based',
    scoringMethod: 'points'
  },
  {
    id: 8,
    name: 'Toss the Can',
    description: 'Toss objects to knock down cans - points-based',
    scoringMethod: 'points'
  },
  {
    id: 9,
    name: 'Hopscotch',
    description: 'Complete hopscotch pattern - timing-based',
    scoringMethod: 'stopwatch'
  },
  {
    id: 10,
    name: 'Beat Buzzer',
    description: 'Complete task before buzzer - timing-based',
    scoringMethod: 'stopwatch'
  },
  {
    id: 11,
    name: 'Tower Tumble',
    description: 'Stack and balance objects - points-based',
    scoringMethod: 'points'
  },
  {
    id: 12,
    name: 'Shoot the Moon',
    description: 'Aim and shoot targets - points-based',
    scoringMethod: 'points'
  },
];

export default function GameSelectionScreen() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const result = await GoogleAppsScriptService.fetchGames();
      if (result.success && result.games.length > 0) {
        setGames(result.games);
      } else {
        console.log('Using fallback games');
        setGames(fallbackGames);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      setGames(fallbackGames);
    } finally {
      setLoading(false);
    }
  };

  const handleGameSelect = (game) => {
    if (game.scoringMethod === 'timeRace') {
      router.push({
        pathname: '/scoring',
        params: {
          gameName: game.name,
          gameId: game.id,
          scoringMethod: game.scoringMethod
        }
      });
    } else {
      router.push({
        pathname: '/participant',
        params: {
          gameName: game.name,
          gameId: game.id,
          scoringMethod: game.scoringMethod
        }
      });
    }
  };

  const handleManageParticipants = () => {
    router.push({
      pathname: '/registration',
      params: { 
        gameName: 'Global Participants',
        gameId: 'global'
      }
    });
  };

  const getScoringMethodLabel = (method) => {
    switch (method) {
      case 'points':
        return 'Points';
      case 'multiplePoints':
        return 'Multiple Points';
      case 'stopwatch':
        return 'Stopwatch';
      case 'timeRace':
        return 'Timing Race';
      default:
        return 'Score';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Game Scoring App</Text>
            <Text style={styles.subtitle}>Select a game to start scoring</Text>
          </View>
          <TouchableOpacity onPress={loadGames} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.manageParticipantsButton} onPress={handleManageParticipants}>
        <Ionicons name="people" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.manageParticipantsText}>Manage Participants</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading games...</Text>
        </View>
      ) : (
        <ScrollView style={styles.gamesList} showsVerticalScrollIndicator={false}>
          {games.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => handleGameSelect(game)}
            >
              <View style={styles.gameInfo}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDescription}>{game.description}</Text>
                <Text style={styles.scoringMethod}>
                  Scoring: {getScoringMethodLabel(game.scoringMethod)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  manageParticipantsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageParticipantsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gamesList: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  scoringMethod: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
}); 