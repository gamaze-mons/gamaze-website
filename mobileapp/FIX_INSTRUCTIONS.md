# Fix Instructions for Google Apps Script Error

## Current Issues
1. **Google Apps Script Error**: "Unexpected error while getting the method or property openById on object SpreadsheetApp"
2. **Mobile App Shows Success but No Data**: The app shows "score submitted successfully" but no data is actually added to the spreadsheet

## Root Cause
The Google Apps Script is trying to access a spreadsheet with an incorrect or placeholder spreadsheet ID (`'YOUR_SPREADSHEET_ID'` instead of the actual ID).

## Step-by-Step Fix

### Step 1: Update Your Google Apps Script
1. Go to [Google Apps Script](https://script.google.com/)
2. Open your existing project or create a new one
3. Replace the code with the corrected version from `google-apps-script-code.js`
4. **IMPORTANT**: Replace `'YOUR_SPREADSHEET_ID'` with your actual spreadsheet ID: `'1Rn_QwF3QdpVojp4JWKk7F_fNGRKSY6OYfnUQnI8jbJQ'`

### Step 2: Test Your Apps Script
1. In the Apps Script editor, run the `runFullTest()` function for comprehensive testing
2. This will test both connection and data writing functionality
3. Check the logs to ensure all tests pass
4. You should see: "✅ Connection test passed" and "✅ doPost test passed"

**Alternative Tests:**
- Run `testConnection()` for basic connection test only
- Run `testDoPost()` for data writing test only

### Step 3: Deploy as Web App
1. Click "Deploy" > "New deployment"
2. Choose "Web app"
3. Set "Execute as" to "Me"
4. Set "Who has access" to "Anyone"
5. Click "Deploy"
6. Copy the new web app URL

### Step 4: Update the Mobile App
1. Open `services/googleSheets.js`
2. Replace the `SCRIPT_URL` with your new web app URL
3. Save the file

### Step 5: Test the Mobile App
1. Start your app: `npm start`
2. Go to the scoring screen
3. Click "Test Apps Script Connection"
4. If successful, you should see a success message
5. Try submitting a real score

## Expected Behavior After Fix
- **Before**: App shows "score submitted successfully" but no data in spreadsheet
- **After**: App shows success message AND data appears in the spreadsheet

## Troubleshooting

### If you still get "openById" error:
1. Double-check the spreadsheet ID in your Apps Script
2. Make sure the spreadsheet exists and you have access to it
3. Run `testConnection()` in Apps Script to verify access

### If the mobile app still shows success but no data:
1. Check the browser console for error messages
2. Verify the Apps Script URL is correct
3. Run `testDoPost()` in Apps Script to test data writing
4. Test the Apps Script directly in the browser

### If you get CORS errors:
1. Make sure your Apps Script is deployed as a web app
2. Set "Who has access" to "Anyone"
3. Try the test connection button in the mobile app

### If tests fail in Apps Script:
1. Check the execution logs in Apps Script for detailed error messages
2. Verify your Google account has access to the spreadsheet
3. Make sure the spreadsheet ID is correct and the spreadsheet exists

## Verification
After completing the fix:
1. Run `runFullTest()` in Apps Script - all tests should pass
2. Submit a test score through the mobile app
3. Check your Google Spreadsheet
4. You should see a new row with: Name, Score, Timestamp
5. The mobile app should show a proper success message

## Files Modified
- `services/googleSheets.js` - Improved error handling
- `app/scoring.js` - Better error messages and testing
- `google-apps-script-code.js` - Corrected Apps Script code with comprehensive tests
- `GOOGLE_SHEETS_SETUP.md` - Updated setup instructions 