# Gamez Website

A modern, responsive website for Gamez company - specializing in hosting interactive games for events and parties.

## Features

### 1. Landing Page (`index.html`)
- **Hero Section**: Eye-catching introduction with animated elements
- **About Section**: Company information (content to be provided)
- **Services**: 6 game categories with icons
- **Gallery**: Photo grid for event images (photos to be added)
- **Contact Section**: Phone number and email with contact form
- **Responsive Navigation**: Mobile-friendly menu

### 2. Live Scores Display (`scores.html`)
- **Slideshow Mode**: Auto-rotating participant scores
- **Participant Cards**: Shows name, photo, score, and achievements
- **Controls**: Play/pause, fullscreen, manual navigation
- **Leaderboard**: Quick view of top performers
- **Settings Panel**: Customizable slide duration and animations

## Project Structure
```
gamezWebsite/
├── index.html          # Landing page
├── scores.html         # Live scores display
├── css/
│   └── styles.css      # Complete styling
├── js/
│   ├── main.js         # Landing page functionality
│   └── scores.js       # Scores display & Google Sheets integration
└── assets/
    └── images/         # Company photos (to be added)
```

## Design Features
- **Modern Gaming Theme**: Purple/orange color scheme
- **Responsive Design**: Works on all devices
- **Smooth Animations**: Professional transitions
- **Interactive Elements**: Hover effects, parallax scrolling
- **Accessibility**: Keyboard navigation support

## Google Sheets Integration

To connect your Google Sheets data:

1. **Enable Google Sheets API**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable "Google Sheets API"
   - Create credentials (API Key)

2. **Prepare Your Spreadsheet**:
   - Make your sheet publicly readable
   - Structure: Column A (Name), Column B (Photo URL), Column C (Score)

3. **Configure in `scores.js`**:
   ```javascript
   const config = {
       googleSheetsApiKey: 'YOUR_API_KEY_HERE',
       spreadsheetId: 'YOUR_SPREADSHEET_ID_HERE',
       sheetName: 'Sheet1'
   };
   ```

4. **Or use the helper function**:
   ```javascript
   GamezScores.setupGoogleSheets('API_KEY', 'SPREADSHEET_ID');
   ```

## Customization

### Update Contact Information
In `index.html`, find the contact section and update:
- Phone: `+1 (555) 123-4567`
- Email: `info@gamezevents.com`

### Add Company Content
Replace placeholder text in the About section with your company description.

### Add Photos
1. Place images in `assets/images/`
2. Update `<img>` tags in gallery section
3. For participant photos, use Google Drive URLs in your spreadsheet

### Modify Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #6B46C1;    /* Purple */
    --secondary-color: #FF6B35;   /* Orange */
}
```

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Notes
- Currently using sample data for scores display
- Google Sheets integration ready but requires API configuration
- All animations are CSS-based for performance
- Forms are frontend-only (backend integration needed for actual submission)

## Quick Start
1. Open `index.html` in a web browser to view the landing page
2. Click "Live Scores" to see the scores display page
3. Configure Google Sheets API for live data
4. Add your content and images as needed