# Google Sheets API Setup Guide

## ⚠️ Security Warning
This approach exposes API credentials in your app code. For production apps, use a backend server instead.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 2: Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy your API key
4. (Optional) Restrict the API key to Google Sheets API only

## Step 3: Create a Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Create sheets for each game:
   - Sheet name: "Game1"
   - Sheet name: "Game2"
4. Add headers in row 1:
   - Column A: "Name"
   - Column B: "Score"
   - Column C: "Timestamp"
5. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit
   ```

## Step 4: Configure the App

1. Open `services/googleSheets.js`
2. Replace the placeholder values:
   ```javascript
   const GOOGLE_SHEETS_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE';
   const SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID_HERE';
   ```

## Step 5: Test the App

1. Start your app: `npm start`
2. Select a game
3. Enter participant name
4. Enter score
5. Submit - it should add a row to your Google Sheet

## Alternative: Google Apps Script (More Secure)

If you want better security, use Google Apps Script:

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Use this code (replace `YOUR_SPREADSHEET_ID` with your actual spreadsheet ID):

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { gameName, participantName, score, timestamp } = data;
    
    // Replace this with your actual spreadsheet ID
    const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(gameName);
    
    if (!sheet) {
      // Create sheet if it doesn't exist
      sheet = spreadsheet.insertSheet(gameName);
      // Add headers
      sheet.getRange(1, 1, 1, 3).setValues([['Name', 'Score', 'Timestamp']]);
      // Format headers
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    }
    
    // Add the new row
    sheet.appendRow([participantName, score, timestamp]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Score added to ${gameName} sheet`,
        row: [participantName, score, timestamp]
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Apps Script error:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: error.toString(),
        message: 'Failed to add score to spreadsheet'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to verify the script works
function testConnection() {
  try {
    const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your actual ID
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Successfully connected to spreadsheet:', spreadsheet.getName());
    return { success: true, spreadsheetName: spreadsheet.getName() };
  } catch (error) {
    console.error('Connection test failed:', error.toString());
    return { error: error.toString() };
  }
}

// Comprehensive test function that calls doPost with test data
function testDoPost() {
  try {
    console.log('Starting comprehensive doPost test...');
    
    // Create a mock POST request with test data
    const testData = {
      gameName: 'Test',
      participantName: 'Test User',
      score: '100',
      timestamp: new Date().toISOString()
    };
    
    const mockPostData = {
      contents: JSON.stringify(testData)
    };
    
    const mockEvent = {
      postData: mockPostData
    };
    
    // Call doPost with the mock data
    const result = doPost(mockEvent);
    
    // Parse the result
    const resultData = JSON.parse(result.getContent());
    
    if (resultData.success) {
      console.log('✅ doPost test successful!');
      console.log('Result:', resultData);
      return { 
        success: true, 
        message: 'doPost test passed successfully',
        result: resultData 
      };
    } else {
      console.log('❌ doPost test failed!');
      console.log('Error:', resultData.error);
      return { 
        success: false, 
        error: resultData.error,
        message: 'doPost test failed' 
      };
    }
    
  } catch (error) {
    console.error('❌ doPost test error:', error.toString());
    return { 
      success: false, 
      error: error.toString(),
      message: 'doPost test encountered an error' 
    };
  }
}

// Function to test both connection and doPost
function runFullTest() {
  console.log('=== Starting Full Test Suite ===');
  
  // Test 1: Basic connection
  console.log('\n1. Testing basic connection...');
  const connectionTest = testConnection();
  if (connectionTest.success) {
    console.log('✅ Connection test passed');
  } else {
    console.log('❌ Connection test failed:', connectionTest.error);
    return connectionTest;
  }
  
  // Test 2: doPost functionality
  console.log('\n2. Testing doPost functionality...');
  const doPostTest = testDoPost();
  if (doPostTest.success) {
    console.log('✅ doPost test passed');
  } else {
    console.log('❌ doPost test failed:', doPostTest.error);
    return doPostTest;
  }
  
  console.log('\n=== All Tests Passed! ===');
  return { 
    success: true, 
    message: 'All tests passed successfully',
    connectionTest,
    doPostTest 
  };
}
```

4. Deploy as web app:
   - Click "Deploy" > "New deployment"
   - Choose "Web app"
   - Set "Execute as" to "Me"
   - Set "Who has access" to "Anyone"
   - Click "Deploy"
   - Copy the web app URL and update the `SCRIPT_URL` in `googleSheets.js`

## Testing Your Google Apps Script

After setting up your Apps Script, you can test it using these functions:

1. **Basic Connection Test**: Run `testConnection()` to verify you can access the spreadsheet
2. **doPost Function Test**: Run `testDoPost()` to test the actual data writing functionality
3. **Full Test Suite**: Run `runFullTest()` to run both tests and get comprehensive results

These tests will help you verify that:
- Your spreadsheet ID is correct
- You have proper access permissions
- The doPost function can successfully write data to the spreadsheet
- The response format is correct

## Troubleshooting

- **403 Error**: Check API key and enable Google Sheets API
- **404 Error**: Check spreadsheet ID and sheet names
- **CORS Error**: Use Google Apps Script instead of direct API calls
- **Rate Limit**: Google has quotas - consider caching or batching
- **"openById" Error**: Make sure you're using the correct spreadsheet ID in your Apps Script

## Production Recommendations

For production apps:
1. Use a backend server (Node.js, Python, etc.)
2. Store credentials securely on the server
3. Add authentication and validation
4. Implement rate limiting and error handling 