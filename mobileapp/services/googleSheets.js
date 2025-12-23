// Google Sheets API Service
// Note: This approach exposes API credentials in the app (not recommended for production)

const GOOGLE_SHEETS_API_KEY = 'AIzaSyAu3pGGxPkULVDrV2gvvWobYTYCDuFKKB4'; // Replace with your actual API key
const SPREADSHEET_ID = '1Rn_QwF3QdpVojp4JWKk7F_fNGRKSY6OYfnUQnI8jbJQ'; // Replace with your spreadsheet ID

// Google Apps Script Web App URL - Update this with your deployed script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOSfrrxa2VUXbtlTkadKUIxpfkvO2bglXJI7XSxw2RCcnbiho79NhumqPIJHSQFXWQ/exec';

export class GoogleSheetsService {
  // Test function to verify API key
  static async testApiKey() {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${GOOGLE_SHEETS_API_KEY}`
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

  static async addScore(gameName, participantName, score) {
    try {
      // Test API key first
      const apiKeyValid = await this.testApiKey();
      if (!apiKeyValid) {
        throw new Error('Invalid API key or spreadsheet ID. Please check your configuration.');
      }

      // Create the spreadsheet name based on game
      const spreadsheetName = `${gameName}.xlsx`;
      
      // Prepare the row data
      const rowData = [
        {
          values: [
            { userEnteredValue: { stringValue: participantName } },
            { userEnteredValue: { stringValue: score.toString() } }
          ]
        }
      ];

      // First, try to find the sheet or create it
      const sheetName = gameName;
      
      // Add the row to the sheet
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:C:append?valueInputOption=USER_ENTERED&key=${GOOGLE_SHEETS_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[participantName, score, new Date().toISOString()]]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Successfully added to Google Sheets:', result);
      return result;

    } catch (error) {
      console.error('Error adding to Google Sheets:', error);
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
  static async addScore(gameName, participantName, score) {
    try {
      console.log('Sending score to Google Apps Script:', { gameName, participantName, score });
      
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addScore',
          gameName,
          participantName,
          score,
          timestamp: new Date().toISOString()
        })
      });

      console.log('Apps Script response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Apps Script HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Apps Script response:', result);
      
      // Check if the result contains an error
      if (result.error) {
        console.error('Apps Script returned error:', result.error);
        throw new Error(`Apps Script error: ${result.error}`);
      }
      
      // Verify success response
      if (!result.success) {
        console.error('Apps Script did not return success:', result);
        throw new Error('Apps Script did not return success status');
      }
      
      console.log('Successfully added via Apps Script:', result);
      return result;

    } catch (error) {
      console.error('Error adding via Apps Script:', error);
      throw error;
    }
  }

  static async addParticipant(gameName, participantName, photoUrl) {
    try {
      console.log('Sending participant to Google Apps Script:', { gameName, participantName, photoUrl });
      
      const response = await fetch(SCRIPT_URL, {
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

      console.log('Apps Script response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Apps Script HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Apps Script response:', result);
      
      // Check if the result contains an error
      if (result.error) {
        console.error('Apps Script returned error:', result.error);
        throw new Error(`Apps Script error: ${result.error}`);
      }
      
      // Verify success response
      if (!result.success) {
        console.error('Apps Script did not return success:', result);
        throw new Error('Apps Script did not return success status');
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
      console.log('Script URL:', SCRIPT_URL);
      console.log('Game name parameter:', gameName);
      
      const requestBody = {
        action: 'getParticipants',
        gameName,
        timestamp: new Date().toISOString()
      };
      console.log('Request body:', requestBody);
      
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Apps Script response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Apps Script HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Apps Script response:', result);
      console.log('Response success:', result.success);
      console.log('Response participants:', result.participants);
      
      // Check if the result contains an error
      if (result.error) {
        console.error('Apps Script returned error:', result.error);
        throw new Error(`Apps Script error: ${result.error}`);
      }
      
      // Return the participants array
      return {
        success: true,
        participants: result.participants || []
      };

    } catch (error) {
      console.error('Error fetching participants via Apps Script:', error);
      console.error('Error details:', error.message);
      // Return empty array on error to prevent app crash
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
      
      const response = await fetch(SCRIPT_URL, {
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

      const response = await fetch(SCRIPT_URL, {
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

      const response = await fetch(SCRIPT_URL, {
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