// Google Sheets API Service
// Note: This approach exposes API credentials in the app (not recommended for production)

import { GOOGLE_CONFIG } from '../config/constants';

export class GoogleSheetsService {
  // Test function to verify API key
  static async testApiKey() {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_CONFIG.SPREADSHEET_ID}?key=${GOOGLE_CONFIG.GOOGLE_SHEETS_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Key is working! Spreadsheet info:', data.properties.title);
        return true;
      } else {
        console.error('API Key test failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('API Key test error:', error);
      return false;
    }
  }

  static async addScore(gameName, participantName, score, pointsScored = null) {
    try {
      const timestamp = new Date().toISOString();

      // Determine the request body based on whether this is a timerAndPoints game
      let requestBody;
      if (pointsScored !== null) {
        // This is a timerAndPoints game - send 4 values
        requestBody = {
          action: 'addScore',
          gameName: gameName,
          participantName: participantName,
          timeTaken: score, // score parameter contains timeTaken
          pointsScored: pointsScored,
          timestamp: timestamp
        };
      } else {
        // This is a regular game - send 3 values
        requestBody = {
          action: 'addScore',
          gameName: gameName,
          participantName: participantName,
          score: score,
          timestamp: timestamp
        };
        }

      console.log('Sending score data:', requestBody);
      
      const response = await fetch(GOOGLE_CONFIG.SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Score submission result:', result);

      if (!result.success) {
        throw new Error(result.message || 'Failed to add score');
      }

      return result;
    } catch (error) {
      console.error('Error adding score:', error);
      throw error;
    }
  }

  static async createSheetIfNotExists(gameName) {
    try {
      // This would require additional API calls to check if sheet exists
      // For now, we'll assume the sheet exists or handle errors gracefully
      console.log(`Sheet ${gameName} should exist or will be created on first write`);
    } catch (error) {
      console.error('Error checking/creating sheet:', error);
      throw error;
    }
  }
}

// Alternative approach using Google Apps Script (more secure)
export class GoogleAppsScriptService {
  static async addScore(gameName, participantName, score, pointsScored = null) {
    try {
      const timestamp = new Date().toISOString();
      
      // Determine the request body based on whether this is a timerAndPoints game
      let requestBody;
      if (pointsScored !== null) {
        // This is a timerAndPoints game - send 4 values
        requestBody = {
          action: 'addScore',
          gameName: gameName,
          participantName: participantName,
          timeTaken: score, // score parameter contains timeTaken
          pointsScored: pointsScored,
          timestamp: timestamp
        };
      } else {
        // This is a regular game - send 3 values
        requestBody = {
          action: 'addScore',
          gameName: gameName,
          participantName: participantName,
          score: score,
          timestamp: timestamp
        };
      }

      console.log('Sending score to Google Apps Script:', requestBody);
      
      const response = await fetch(GOOGLE_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        console.error('Apps Script error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('Successfully added score via Apps Script:', result);
      return result;

    } catch (error) {
      console.error('Error adding via Apps Script:', error);
      throw error;
    }
  }

  static async addParticipant(gameName, participantName, photoUrl) {
    try {
      console.log('Sending participant to Google Apps Script:', { gameName, participantName, photoUrl });
      
      const response = await fetch(GOOGLE_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addParticipant',
          gameName,
          participantName,
          photoUrl,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        console.error('Apps Script error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('Successfully added participant via Apps Script:', result);
      return result;

    } catch (error) {
      console.error('Error adding participant via Apps Script:', error);
      throw error;
    }
  }

  static async getParticipants(gameName) {
    try {
      console.log('Fetching participants from Google Apps Script:');
      console.log('Script URL:', GOOGLE_CONFIG.SCRIPT_URL);
      console.log('Game name parameter:', gameName);
      
      const requestBody = {
        action: 'getParticipants',
        gameName,
        timestamp: new Date().toISOString()
      };
      console.log('Request body:', requestBody);
      
      const response = await fetch(GOOGLE_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();

      if (result.error) {
        console.error('Apps Script error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('Successfully fetched participants via Apps Script:', result);
      return result;

    } catch (error) {
      console.error('Error fetching participants via Apps Script:', error);
      console.error('Error details:', error.message);
      // Return empty array instead of throwing to prevent app crashes
      return {
        success: true,
        participants: []
      };
    }
  }

  // Get upload URL for direct Google Drive upload
  static async getUploadUrl(participantName) {
    try {
      console.log('Getting upload URL for participant:', participantName);
      
      const response = await fetch(GOOGLE_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getUploadUrl',
          participantName,
          timestamp: new Date().toISOString()
        })
      });

      console.log('Upload URL response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload URL HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload URL response:', result);
      
      if (result.error) {
        console.error('Apps Script returned error:', result.error);
        throw new Error(`Apps Script error: ${result.error}`);
      }
      
      return result;

    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  }

  // Save photo URL after direct upload
  static async savePhotoUrl(participantName, photoUrl) {
    try {
      console.log('Saving photo URL for participant:', participantName);
      console.log('Photo URL:', photoUrl);

      const response = await fetch(GOOGLE_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'savePhotoUrl',
          participantName,
          photoUrl,
          timestamp: new Date().toISOString()
        })
      });

      console.log('Save photo URL response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save photo URL HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Save photo URL response:', result);

      if (result.error) {
        console.error('Apps Script returned error:', result.error);
        throw new Error(`Apps Script error: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('Error saving photo URL:', error);
      throw error;
    }
  }

  // Fetch games list from Google Sheets
  static async fetchGames() {
    try {
      console.log('Fetching games from Google Apps Script');

      const response = await fetch(GOOGLE_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getGames',
          timestamp: new Date().toISOString()
        })
      });

      console.log('Fetch games response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch games HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Fetch games response:', result);

      if (result.error) {
        console.error('Apps Script returned error:', result.error);
        throw new Error(`Apps Script error: ${result.error}`);
      }

      return {
        success: true,
        games: result.games || []
      };

    } catch (error) {
      console.error('Error fetching games:', error);
      return {
        success: false,
        games: []
      };
    }
  }
} 
