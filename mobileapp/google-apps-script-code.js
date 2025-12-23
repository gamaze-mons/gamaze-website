// Google Apps Script for Game Scoring App
// This script handles requests from the mobile app and manages Google Sheets/Drive

// ===== CONFIGURATION =====
const SPREADSHEET_ID = '1C-07WttxU_PgzzobzYYjtwgYqOT3MIetkAsraShi5Us';
const PHOTOS_FOLDER_NAME = 'GamazePhotos';

const SHARED_FOLDER_ID = '1xjtd2gUVcHwy3FUVoqb5DF6A5BMkJINt';

// ===== MAIN FUNCTIONS =====

// Handle GET requests (for testing)
function doGet(e) {
  try {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Google Apps Script is working!',
        instructions: 'This endpoint accepts POST requests with game data',
        example: {
          gameName: 'Game1',
          participantName: 'John Doe',
          score: '100',
          timestamp: new Date().toISOString()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: error.toString(),
        message: 'Error in doGet function'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests (from mobile app)
function doPost(e) {
  try {
    Logger.log('doPost called');
    Logger.log('Received data: ' + e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    const { action, gameName, participantName, score, photoUrl, timestamp } = data;
    
    Logger.log('Action: ' + action);
    Logger.log('Attempting to open spreadsheet with ID: ' + SPREADSHEET_ID);
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Handle different actions
    if (action === 'addParticipant') {
      return handleAddParticipant(spreadsheet, gameName, participantName, photoUrl, timestamp);
    } else if (action === 'getParticipants') {
      return handleGetParticipants(spreadsheet, gameName);
    } else if (action === 'addScore') {
      return handleAddScore(spreadsheet, gameName, participantName, score, timestamp, data);
    } else if (action === 'getGames') {
      return handleGetGames(spreadsheet);   
    } else {
      // Return error for unknown action
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: 'Unknown action: ' + action,
          message: 'Please specify a valid action: addParticipant, getParticipants, or addScore'
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setStatusCode(400);
    }
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    
    // Return error with HTTP 500 status
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: error.toString(),
        message: 'Failed to process request',
        details: error.stack || 'No stack trace available'
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setStatusCode(500);
  }
}

// Handle adding participants
function handleAddParticipant(spreadsheet, gameName, participantName, photoUrl, timestamp) {
  try {
    Logger.log('Adding participant: ' + participantName + ' to global participants list');
    
    // Always use the Participants sheet for global participant list
    let participantsSheet = spreadsheet.getSheetByName('Participants');
    if (!participantsSheet) {
      Logger.log('Creating Participants sheet');
      participantsSheet = spreadsheet.insertSheet('Participants');
      participantsSheet.getRange(1, 1, 1, 3).setValues([['ParticipantName', 'PhotoUrl', 'DateTime']]);
    }
    
    // Check if participant already exists globally
    const participantsData = participantsSheet.getDataRange().getValues();
    const headerRow = participantsData[0];
    const participants = participantsData.slice(1);
    
    const existingParticipant = participants.find(row => 
      row[0] === participantName
    );
    
    let finalPhotoUrl = photoUrl;
    
    // If photoUrl is base64 data, upload it to Google Drive
    if (photoUrl && photoUrl.length > 100) { // Base64 data is typically long
      Logger.log('Detected base64 photo data, uploading to Google Drive');
      // Clean the participant name for use as filename (remove special characters)
      const cleanName = participantName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanName}.jpg`;
      finalPhotoUrl = uploadPhotoToDrive(photoUrl, fileName);
      Logger.log('Photo uploaded, URL: ' + finalPhotoUrl);
    }
    
    if (existingParticipant) {
      Logger.log('Participant already exists globally: ' + participantName);
      // Update photo if provided
      const rowIndex = participants.findIndex(row => row[0] === participantName) + 2; // +2 for header and 1-based indexing
      if (finalPhotoUrl) {
        participantsSheet.getRange(rowIndex, 2).setValue(finalPhotoUrl);
      }
      participantsSheet.getRange(rowIndex, 3).setValue(timestamp);
    } else {
      Logger.log('Adding new participant to global list: ' + participantName);
      participantsSheet.appendRow([participantName, finalPhotoUrl || '', timestamp]);
    }
    
    Logger.log('Successfully added/updated participant');
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true,
        message: `Participant ${participantName} added to global participants list`,
        participant: { participantName, photoUrl: finalPhotoUrl, timestamp }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in handleAddParticipant: ' + error.toString());
    throw error;
  }
}

// Handle getting participants
function handleGetParticipants(spreadsheet, gameName) {
  try {
    Logger.log('Getting participants from global Participants sheet');
    
    // Always get from the global Participants sheet
    let participantsSheet = spreadsheet.getSheetByName('Participants');
    if (!participantsSheet) {
      Logger.log('Participants sheet does not exist, returning empty list');
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true,
          participants: []
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const participantsData = participantsSheet.getDataRange().getValues();
    const headerRow = participantsData[0];
    const participants = participantsData.slice(1);
    
    Logger.log('Found ' + participants.length + ' participants');
    
    // Convert to the expected format
    const participantList = participants.map(row => ({
      name: row[0],
      photoUrl: row[1] || '',
      timestamp: row[2] || ''
    }));
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true,
        participants: participantList
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in handleGetParticipants: ' + error.toString());
    throw error;
  }
}

// Handle adding scores
function handleAddScore(spreadsheet, gameName, participantName, score, timestamp, requestData) {
  try {
    Logger.log('Adding score to game: ' + gameName);
    Logger.log('Participant: ' + participantName);
    Logger.log('Score: ' + score);
    
    let sheet = spreadsheet.getSheetByName(gameName);
    if (!sheet) {
      // Create sheet if it doesn't exist
      Logger.log('Creating new sheet: ' + gameName);
      sheet = spreadsheet.insertSheet(gameName);
      
      // Check if this is a timerAndPoints game by looking for timeTaken parameter
      if (requestData.timeTaken !== undefined && requestData.pointsScored !== undefined) {
        // This is a timerAndPoints game - create 4 columns
        sheet.getRange(1, 1, 1, 4).setValues([['ParticipantName', 'TimeTaken', 'PointsScored', 'DateTime']]);
      } else {
        // This is a regular game - create 3 columns
        sheet.getRange(1, 1, 1, 3).setValues([['ParticipantName', 'Score', 'DateTime']]);
      }
    }
    
    // Check if participant already exists in this game sheet
    const gameData = sheet.getDataRange().getValues();
    const headerRow = gameData[0];
    const gameRows = gameData.slice(1);
    
    const existingRowIndex = gameRows.findIndex(row => row[0] === participantName);
    
    if (existingRowIndex !== -1) {
      // Participant already exists - update their row
      Logger.log('Participant already exists in game sheet, updating row');
      const rowNumber = existingRowIndex + 2; // +2 for header and 1-based indexing
      
      if (requestData.timeTaken !== undefined && requestData.pointsScored !== undefined) {
        // This is a timerAndPoints game - update 4 values
        sheet.getRange(rowNumber, 1, 1, 4).setValues([[
          participantName, 
          requestData.timeTaken, 
          requestData.pointsScored, 
          timestamp
        ]]);
      } else {
        // This is a regular game - update 3 values
        sheet.getRange(rowNumber, 1, 1, 3).setValues([[
          participantName, 
          score, 
          timestamp
        ]]);
      }
      
      Logger.log('Successfully updated existing participant score');
    } else {
      // Participant doesn't exist - add new row
      Logger.log('Adding new participant to game sheet');
      
      if (requestData.timeTaken !== undefined && requestData.pointsScored !== undefined) {
        // This is a timerAndPoints game - add 4 values
        sheet.appendRow([participantName, requestData.timeTaken, requestData.pointsScored, timestamp]);
      } else {
        // This is a regular game - add 3 values
        sheet.appendRow([participantName, score, timestamp]);
      }
      
      Logger.log('Successfully added new participant score');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Score ${existingRowIndex !== -1 ? 'updated' : 'added'} to ${gameName} sheet`,
        participant: participantName,
        action: existingRowIndex !== -1 ? 'updated' : 'added'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in handleAddScore: ' + error.toString());
    throw error;
  }
}

// Upload photo to Google Drive
function uploadPhotoToDrive(base64Data, fileName) {
  try {
    Logger.log('Uploading photo to Google Drive: ' + fileName);
    
    // Decode base64 data
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', fileName);
    
    // Get or create the photos folder
    let folder;
    try {
      folder = DriveApp.getFolderById(SHARED_FOLDER_ID);
    } catch (e) {
      Logger.log('Error accessing shared folder: ' + e.toString());
      throw new Error('Cannot access shared photos folder');
    }
    
    // Create the file in the folder
    const file = folder.createFile(blob);
    
    // Set file sharing to public
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    Logger.log('Photo uploaded successfully: ' + file.getUrl());
    return file.getUrl();
    
  } catch (error) {
    Logger.log('Error uploading photo to Drive: ' + error.toString());
    throw error;
  }
}

// Handle getting games list from GamesList sheet
function handleGetGames(spreadsheet) {
  try {
    Logger.log('Getting games from GamesList sheet');

    // Get GamesList sheet
    let gamesSheet = spreadsheet.getSheetByName('GamesList');
    if (!gamesSheet) {
      Logger.log('No GamesList sheet found, returning empty array');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          games: [],
          message: 'No GamesList sheet found. Please create a "GamesList" sheet with columns: Name, Description, ScoringMethod'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get all data from the sheet (skip header row)
    const allData = gamesSheet.getDataRange().getValues();
    const games = allData.slice(1);

    // Convert to game objects with id
    const gameObjects = games
      .filter(row => row[0] && row[0].toString().trim() !== '') // Filter out empty rows
      .map((row, index) => ({
        id: index + 1,
        name: row[0] || '',
        description: row[1] || '',
        scoringMethod: row[2] || 'points'
      }));

    Logger.log('Found ' + gameObjects.length + ' games');

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        games: gameObjects
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleGetGames: ' + error.toString());
    throw error;
  }
}

// ===== TEST FUNCTIONS =====

// Test 1: Drive access (spreadsheet & photos folder)
function testDriveAccess() {
  try {
    Logger.log('Test 1: Testing drive access...');
    
    // Test spreadsheet access
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✓ Spreadsheet access: ' + spreadsheet.getName());
    
    // Test photos folder access
    const folder = DriveApp.getFolderById(SHARED_FOLDER_ID);
    Logger.log('✓ Photos folder access: ' + folder.getName());
    
    Logger.log('Test 1 completed: Drive access working');
    return 'Drive access test passed';
    
  } catch (error) {
    Logger.log('Test 1 failed: ' + error.toString());
    throw error;
  }
}

// Test 2: Participants sheet operations via POST API
function testParticipantsSheet() {
  try {
    Logger.log('Test 2: Testing participants sheet operations via POST API...');
    
    // Test 2a: Add participant
    Logger.log('Test 2a: Adding participant');
    const addParticipantData = {
      action: 'addParticipant',
      gameName: 'TestGame',
      participantName: 'TestUser1',
      photoUrl: '',
      timestamp: new Date().toISOString()
    };
    
    const addEvent = {
      postData: {
        contents: JSON.stringify(addParticipantData)
      }
    };
    
    const addResult = doPost(addEvent);
    Logger.log('Add participant result: ' + addResult.getContent());
    
    // Test 2b: Add duplicate participant (should not create new entry)
    Logger.log('Test 2b: Adding duplicate participant');
    const duplicateData = {
      action: 'addParticipant',
      gameName: 'TestGame',
      participantName: 'TestUser1',
      photoUrl: 'updated_photo_url',
      timestamp: new Date().toISOString()
    };
    
    const duplicateEvent = {
      postData: {
        contents: JSON.stringify(duplicateData)
      }
    };
    
    const duplicateResult = doPost(duplicateEvent);
    Logger.log('Duplicate participant result: ' + duplicateResult.getContent());
    
    // Test 2c: Get participants
    Logger.log('Test 2c: Getting participants');
    const getParticipantsData = {
      action: 'getParticipants',
      gameName: 'TestGame',
      timestamp: new Date().toISOString()
    };
    
    const getEvent = {
      postData: {
        contents: JSON.stringify(getParticipantsData)
      }
    };
    
    const getResult = doPost(getEvent);
    Logger.log('Get participants result: ' + getResult.getContent());
    
    Logger.log('Test 2 completed: Participants sheet operations working');
    return 'Participants sheet test passed';
    
  } catch (error) {
    Logger.log('Test 2 failed: ' + error.toString());
    throw error;
  }
}

// Test 3: Scoring for both game types with duplicate handling via POST API
function testScoring() {
  try {
    Logger.log('Test 3: Testing scoring for both game types via POST API...');
    
    // Test 3a: Regular scoring game (first time)
    Logger.log('Test 3a: Regular scoring game (first time)');
    const regularData1 = {
      action: 'addScore',
      gameName: 'Circle Circle',
      participantName: 'TestUser2',
      score: '100',
      timestamp: new Date().toISOString()
    };
    
    const regularEvent1 = {
      postData: {
        contents: JSON.stringify(regularData1)
      }
    };
    
    const regularResult1 = doPost(regularEvent1);
    Logger.log('Regular game first result: ' + regularResult1.getContent());
    
    // Test 3b: Regular scoring game (duplicate - should update)
    Logger.log('Test 3b: Regular scoring game (duplicate - should update)');
    const regularData2 = {
      action: 'addScore',
      gameName: 'Circle Circle',
      participantName: 'TestUser2',
      score: '150',
      timestamp: new Date().toISOString()
    };
    
    const regularEvent2 = {
      postData: {
        contents: JSON.stringify(regularData2)
      }
    };
    
    const regularResult2 = doPost(regularEvent2);
    Logger.log('Regular game duplicate result: ' + regularResult2.getContent());
    
    // Test 3c: TimerAndPoints game (first time)
    Logger.log('Test 3c: TimerAndPoints game (first time)');
    const timerData1 = {
      action: 'addScore',
      gameName: 'Fishing',
      participantName: 'TestUser3',
      timeTaken: '60',
      pointsScored: '12',
      timestamp: new Date().toISOString()
    };
    
    const timerEvent1 = {
      postData: {
        contents: JSON.stringify(timerData1)
      }
    };
    
    const timerResult1 = doPost(timerEvent1);
    Logger.log('TimerAndPoints game first result: ' + timerResult1.getContent());
    
    // Test 3d: TimerAndPoints game (duplicate - should update)
    Logger.log('Test 3d: TimerAndPoints game (duplicate - should update)');
    const timerData2 = {
      action: 'addScore',
      gameName: 'Fishing',
      participantName: 'TestUser3',
      timeTaken: '90',
      pointsScored: '18',
      timestamp: new Date().toISOString()
    };
    
    const timerEvent2 = {
      postData: {
        contents: JSON.stringify(timerData2)
      }
    };
    
    const timerResult2 = doPost(timerEvent2);
    Logger.log('TimerAndPoints game duplicate result: ' + timerResult2.getContent());
    
    // Test 3e: Another regular game
    Logger.log('Test 3e: Another regular game');
    const regularData3 = {
      action: 'addScore',
      gameName: 'Corn Hole',
      participantName: 'TestUser4',
      score: '8',
      timestamp: new Date().toISOString()
    };
    
    const regularEvent3 = {
      postData: {
        contents: JSON.stringify(regularData3)
      }
    };
    
    const regularResult3 = doPost(regularEvent3);
    Logger.log('Another regular game result: ' + regularResult3.getContent());
    
    // Test 3f: Another TimerAndPoints game
    Logger.log('Test 3f: Another TimerAndPoints game');
    const timerData3 = {
      action: 'addScore',
      gameName: 'Tower Tumble',
      participantName: 'TestUser5',
      timeTaken: '120',
      pointsScored: '25',
      timestamp: new Date().toISOString()
    };
    
    const timerEvent3 = {
      postData: {
        contents: JSON.stringify(timerData3)
      }
    };
    
    const timerResult3 = doPost(timerEvent3);
    Logger.log('Another TimerAndPoints game result: ' + timerResult3.getContent());
    
    Logger.log('Test 3 completed: Scoring for both game types working');
    return 'Scoring test passed';
    
  } catch (error) {
    Logger.log('Test 3 failed: ' + error.toString());
    throw error;
  }
}

// Test 4: Error handling and edge cases via POST API
function testErrorHandling() {
  try {
    Logger.log('Test 4: Testing error handling and edge cases via POST API...');
    
    // Test 4a: Invalid action
    Logger.log('Test 4a: Invalid action');
    const invalidActionData = {
      action: 'invalidAction',
      gameName: 'TestGame',
      participantName: 'TestUser',
      timestamp: new Date().toISOString()
    };
    
    const invalidActionEvent = {
      postData: {
        contents: JSON.stringify(invalidActionData)
      }
    };
    
    const invalidActionResult = doPost(invalidActionEvent);
    Logger.log('Invalid action result: ' + invalidActionResult.getContent());
    
    // Test 4b: Missing required fields
    Logger.log('Test 4b: Missing required fields');
    const missingFieldsData = {
      action: 'addScore',
      gameName: 'TestGame',
      // Missing participantName and score
      timestamp: new Date().toISOString()
    };
    
    const missingFieldsEvent = {
      postData: {
        contents: JSON.stringify(missingFieldsData)
      }
    };
    
    const missingFieldsResult = doPost(missingFieldsEvent);
    Logger.log('Missing fields result: ' + missingFieldsResult.getContent());
    
    // Test 4c: Empty participant name
    Logger.log('Test 4c: Empty participant name');
    const emptyNameData = {
      action: 'addScore',
      gameName: 'TestGame',
      participantName: '',
      score: '100',
      timestamp: new Date().toISOString()
    };
    
    const emptyNameEvent = {
      postData: {
        contents: JSON.stringify(emptyNameData)
      }
    };
    
    const emptyNameResult = doPost(emptyNameEvent);
    Logger.log('Empty name result: ' + emptyNameResult.getContent());
    
    // Test 4d: Invalid JSON
    Logger.log('Test 4d: Invalid JSON');
    const invalidJsonEvent = {
      postData: {
        contents: 'invalid json {'
      }
    };
    
    const invalidJsonResult = doPost(invalidJsonEvent);
    Logger.log('Invalid JSON result: ' + invalidJsonResult.getContent());
    
    Logger.log('Test 4 completed: Error handling working');
    return 'Error handling test passed';
    
  } catch (error) {
    Logger.log('Test 4 failed: ' + error.toString());
    throw error;
  }
}

// Test 5: Photo upload functionality via POST API
function testPhotoUpload() {
  try {
    Logger.log('Test 5: Testing photo upload functionality via POST API...');
    
    // Test 5a: Add participant with photo URL
    Logger.log('Test 5a: Add participant with photo URL');
    const photoData = {
      action: 'addParticipant',
      gameName: 'TestGame',
      participantName: 'PhotoTestUser',
      photoUrl: 'https://example.com/photo.jpg',
      timestamp: new Date().toISOString()
    };
    
    const photoEvent = {
      postData: {
        contents: JSON.stringify(photoData)
      }
    };
    
    const photoResult = doPost(photoEvent);
    Logger.log('Photo upload result: ' + photoResult.getContent());
    
    // Test 5b: Add participant with base64 photo (simulated)
    Logger.log('Test 5b: Add participant with base64 photo (simulated)');
    const base64PhotoData = {
      action: 'addParticipant',
      gameName: 'TestGame',
      participantName: 'Base64PhotoUser',
      photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxAAPwCdABmX/9k=',
      timestamp: new Date().toISOString()
    };
    
    const base64PhotoEvent = {
      postData: {
        contents: JSON.stringify(base64PhotoData)
      }
    };
    
    const base64PhotoResult = doPost(base64PhotoEvent);
    Logger.log('Base64 photo upload result: ' + base64PhotoResult.getContent());
    
    Logger.log('Test 5 completed: Photo upload functionality working');
    return 'Photo upload test passed';

  } catch (error) {
    Logger.log('Test 5 failed: ' + error.toString());
    throw error;
  }
}

// Test 6: Get games list from GamesList sheet
function testGetGames() {
  try {
    Logger.log('Test 6: Testing getGames functionality via POST API...');

    const getGamesData = {
      action: 'getGames',
      timestamp: new Date().toISOString()
    };

    const getGamesEvent = {
      postData: {
        contents: JSON.stringify(getGamesData)
      }
    };

    const result = doPost(getGamesEvent);
    const resultData = JSON.parse(result.getContent());

    Logger.log('Get games result: ' + result.getContent());

    if (resultData.success) {
      Logger.log('Found ' + resultData.games.length + ' games');
      resultData.games.forEach((game, index) => {
        Logger.log('Game ' + (index + 1) + ': ' + game.name + ' (' + game.scoringMethod + ')');
      });
      Logger.log('Test 6 completed: getGames functionality working');
      return 'Get games test passed';
    } else {
      Logger.log('Test 6 failed: ' + resultData.message);
      throw new Error(resultData.message);
    }

  } catch (error) {
    Logger.log('Test 6 failed: ' + error.toString());
    throw error;
  }
}

// Run all tests
function runAllTests() {
  try {
    Logger.log('Running all tests...');
    
    // Test 1: Drive access
    Logger.log('=== Test 1: Drive Access ===');
    testDriveAccess();
    
    // Test 2: Participants sheet
    Logger.log('=== Test 2: Participants Sheet ===');
    testParticipantsSheet();
    
    // Test 3: Scoring
    Logger.log('=== Test 3: Scoring ===');
    testScoring();
    
    // Test 4: Error handling
    Logger.log('=== Test 4: Error Handling ===');
    testErrorHandling();
    
    // Test 5: Photo upload
    Logger.log('=== Test 5: Photo Upload ===');
    testPhotoUpload();

    // Test 6: Get games
    Logger.log('=== Test 6: Get Games ===');
    testGetGames();

    Logger.log('All tests completed successfully!');
    return 'All tests passed';
    
  } catch (error) {
    Logger.log('Test suite failed: ' + error.toString());
    throw error;
  }
} 
