// ===== GAMAZE Carnival Scores Display System =====

// Configuration
const config = {
    spreadsheetId: '1C-07WttxU_PgzzobzYYjtwgYqOT3MIetkAsraShi5Us',
    apiKey: 'AIzaSyBHVyP4qX3-WA2t3lIo14KK3Nbg5aY6MGs', // Google Sheets API key
    participantsSheet: 'Participants',
    gamesListSheet: 'GamesList',
    gameSheets: [],
    slideDuration: 8000, // 8 seconds per slide
    topParticipants: 5, // Show top 5 per game
    participantsRefreshInterval: 60000 // Refresh participants every 60 seconds
};

// State
let currentGameIndex = 0;
let gamesData = []; // Cache for game data
let participantsData = {};
let isPlaying = true;
let slideInterval;
let currentGameRefreshInterval; // Refresh current game periodically

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
    showLoading(true);
    loadInitialData();
    // Refresh participants periodically (photos might change)
    setInterval(loadParticipants, config.participantsRefreshInterval);
});

// ===== Google Sheets Data Fetching (Using Sheets API v4) =====
async function fetchSheetData(sheetName) {
    // Using Google Sheets API v4 for real-time data (no caching)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${config.apiKey}`;

    console.log(`Fetching: ${sheetName}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log(`Response for "${sheetName}":`, data);

        if (data.error) {
            console.error(`API Error for "${sheetName}":`, data.error.message, data.error);
            return { headers: [], rows: [] };
        }

        if (data.values && data.values.length > 0) {
            // First row is headers, rest are data rows
            const headers = data.values[0];
            const rows = data.values.slice(1);
            console.log(`Got ${rows.length} rows from "${sheetName}"`);
            return { headers, rows };
        }
        return { headers: [], rows: [] };
    } catch (error) {
        console.error(`Error fetching sheet "${sheetName}":`, error);
        return { headers: [], rows: [] };
    }
}

// Load participants (name -> photo mapping)
async function loadParticipants() {
    const data = await fetchSheetData(config.participantsSheet);
    participantsData = {};

    if (data.rows.length > 0) {
        const nameIdx = findColumnIndex(data.headers, ['ParticipantName', 'Name', 'Participant']);
        const photoIdx = findColumnIndex(data.headers, ['PhotoUrl', 'Photo URL', 'Photo', 'URL', 'PhotoURL']);

        data.rows.forEach(row => {
            const name = row[nameIdx] || '';
            let photo = row[photoIdx] || '';

            if (photo && photo.includes('drive.google.com')) {
                const fileIdMatch = photo.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (fileIdMatch) {
                    // Use lh3.googleusercontent.com - works for embedding
                    photo = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
                }
            }

            if (name) {
                participantsData[name.toLowerCase().trim()] = photo;
            }
        });
    }
}

// Load game sheets list
async function loadGamesList() {
    const data = await fetchSheetData(config.gamesListSheet);
    config.gameSheets = [];

    if (data.rows.length > 0) {
        data.rows.forEach(row => {
            const gameName = row[0];
            if (gameName && gameName.trim()) {
                config.gameSheets.push(gameName.trim());
            }
        });
    }
}

// Fetch sheet data (single request - sheet names are case-sensitive in API)
async function fetchSheetDataFlexible(sheetName) {
    const normalized = sheetName.trim();
    const data = await fetchSheetData(normalized);
    return { data, actualName: normalized };
}

// Helper: Find column index (exact match only, returns -1 if not found)
function findColumnIndexExact(headers, possibleNames) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim().replace(/\s+/g, '');
        for (const name of possibleNames) {
            const normalizedName = name.toLowerCase().replace(/\s+/g, '');
            if (header === normalizedName) {
                return i;
            }
        }
    }
    return -1;
}

// Helper: Check if a value is a time format (MM:SS or Google Sheets Date)
function isTimeValue(rawScore) {
    if (rawScore === null || rawScore === undefined || rawScore === '') {
        return false;
    }

    const scoreStr = String(rawScore).trim();

    // Check for Google Sheets Date format
    if (/^Date\(\d+,\d+,\d+,\d+,\d+,\d+\)$/i.test(scoreStr)) {
        return true;
    }

    // Check for MM:SS format
    if (/^\d{1,2}:\d{2}$/.test(scoreStr)) {
        return true;
    }

    return false;
}

// Helper: Parse time value to seconds
function parseTimeToSeconds(rawTime) {
    if (rawTime === null || rawTime === undefined || rawTime === '') {
        return 0;
    }

    const timeStr = String(rawTime).trim();

    // Handle Google Sheets Date format: Date(1899,11,30,hours,minutes,seconds)
    // Reinterpret: hours→minutes, minutes→seconds (see formatScoreForDisplay comment)
    const dateMatch = timeStr.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) {
        const hours = parseInt(dateMatch[1]) || 0;
        const minutes = parseInt(dateMatch[2]) || 0;
        // Reinterpret: hours as minutes, minutes as seconds
        return hours * 60 + minutes;
    }

    // Handle MM:SS format
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
        const mins = parseInt(timeMatch[1]) || 0;
        const secs = parseInt(timeMatch[2]) || 0;
        return mins * 60 + secs;
    }

    // Try parsing as plain number (seconds)
    const numTime = parseFloat(timeStr);
    return isNaN(numTime) ? 0 : numTime;
}

// Helper: Find column index
function findColumnIndex(headers, possibleNames) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim();
        for (const name of possibleNames) {
            if (header === name.toLowerCase() || header.includes(name.toLowerCase())) {
                return i;
            }
        }
    }
    return possibleNames.includes('Score') ? 1 : 0;
}

// Helper: Parse score - handles numeric, MM:SS time format, Google Sheets Date format, and timer+points format
// Returns a numeric value for sorting (higher = better rank)
function parseScore(rawScore) {
    if (rawScore === null || rawScore === undefined || rawScore === '') {
        return 0;
    }

    const scoreStr = String(rawScore).trim();

    // Handle Google Sheets Date format: Date(1899,11,30,hours,minutes,seconds)
    // This is how Google Sheets returns time values via the API
    // NOTE: Google Sheets interprets "00:06" as HH:MM (0 hours, 6 minutes)
    // but mobile app sends it as MM:SS (0 minutes, 6 seconds)
    // So we reinterpret: hours→minutes, minutes→seconds
    const dateMatch = scoreStr.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) {
        const hours = parseInt(dateMatch[1]) || 0;
        const minutes = parseInt(dateMatch[2]) || 0;
        const seconds = parseInt(dateMatch[3]) || 0;
        // Reinterpret: treat hours as minutes, minutes as seconds
        const actualMinutes = hours;
        const actualSeconds = minutes;
        const totalSeconds = actualMinutes * 60 + actualSeconds;
        // Return negative so lower time ranks higher in descending sort
        return -totalSeconds;
    }

    // Handle "MM:SS - Xpts" format (timerAndPoints)
    // Sort by points first, then by time (lower time = better)
    const timerPointsMatch = scoreStr.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d+)\s*pts?$/i);
    if (timerPointsMatch) {
        const minutes = parseInt(timerPointsMatch[1]) || 0;
        const seconds = parseInt(timerPointsMatch[2]) || 0;
        const points = parseInt(timerPointsMatch[3]) || 0;
        const totalSeconds = minutes * 60 + seconds;
        // Points * 10000 dominates, subtract seconds so lower time wins tiebreaker
        return points * 10000 - totalSeconds;
    }

    // Handle MM:SS time format (stopwatch/timeRace) - lower time = better
    const timeMatch = scoreStr.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
        const minutes = parseInt(timeMatch[1]) || 0;
        const seconds = parseInt(timeMatch[2]) || 0;
        const totalSeconds = minutes * 60 + seconds;
        // Return negative so lower time ranks higher in descending sort
        return -totalSeconds;
    }

    // Handle plain numeric score (higher = better)
    const numScore = parseFloat(scoreStr);
    return isNaN(numScore) ? 0 : numScore;
}

// Helper: Format raw score for display
function formatScoreForDisplay(rawScore) {
    if (rawScore === null || rawScore === undefined || rawScore === '') {
        return '0';
    }

    const scoreStr = String(rawScore).trim();

    // Handle Google Sheets Date format: Date(1899,11,30,hours,minutes,seconds)
    // NOTE: Google Sheets interprets "00:06" as HH:MM (0 hours, 6 minutes)
    // but mobile app sends it as MM:SS (0 minutes, 6 seconds)
    // So we reinterpret: hours→minutes, minutes→seconds
    const dateMatch = scoreStr.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) {
        const hours = parseInt(dateMatch[1]) || 0;
        const minutes = parseInt(dateMatch[2]) || 0;
        // Reinterpret: treat hours as minutes, minutes as seconds
        const actualMinutes = hours;
        const actualSeconds = minutes;
        return `${actualMinutes.toString().padStart(2, '0')}:${actualSeconds.toString().padStart(2, '0')}`;
    }

    // Return as-is for other formats
    return scoreStr;
}

// Load initial data (GamesList + Participants only)
async function loadInitialData() {
    try {
        await loadGamesList();
        await loadParticipants();
        showLoading(false);

        if (config.gameSheets.length > 0) {
            // Load first game and start slideshow
            await loadAndShowGame(0);
            if (isPlaying) {
                startSlideshow();
            }
        } else {
            showNoData();
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        showLoading(false);
        showError();
    }
}

// Load a single game's data and display it
async function loadAndShowGame(gameIndex) {
    if (config.gameSheets.length === 0) return;

    const gameName = config.gameSheets[gameIndex];
    console.log(`Loading game: ${gameName}`);

    try {
        const { data, actualName } = await fetchSheetDataFlexible(gameName);

        if (data.rows.length > 0) {
            const gameData = processGameData(data, actualName);
            if (gameData) {
                // Update cache for this game
                gamesData[gameIndex] = gameData;
                currentGameIndex = gameIndex;
                renderCurrentGame();
                return;
            }
        }

        // If no data but we have cached data, show cached
        if (gamesData[gameIndex]) {
            currentGameIndex = gameIndex;
            renderCurrentGame();
            console.log(`Using cached data for: ${gameName}`);
        }
    } catch (error) {
        console.error(`Error loading game ${gameName}:`, error);
        // On error, try to show cached data
        if (gamesData[gameIndex]) {
            currentGameIndex = gameIndex;
            renderCurrentGame();
            console.log(`Using cached data due to error for: ${gameName}`);
        }
    }
}

// Process game data from sheet
function processGameData(data, gameName) {
    const nameIdx = findColumnIndex(data.headers, ['ParticipantName', 'Name', 'Participant']);
    const scoreIdx = findColumnIndex(data.headers, ['Score', 'Points']);

    // Check for timerAndPoints game
    const timeIdx = findColumnIndexExact(data.headers, ['TimeTaken', 'Time Taken', 'Time']);
    const pointsIdx = findColumnIndexExact(data.headers, ['PointsScored', 'Points Scored']);
    const isTimerAndPoints = timeIdx !== -1 && pointsIdx !== -1;

    const participants = data.rows
        .map(row => {
            const name = row[nameIdx] || '';
            const photoKey = name.toLowerCase().trim();
            const photo = participantsData[photoKey] ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a237e&color=fff&size=150`;

            if (isTimerAndPoints) {
                const rawTime = row[timeIdx];
                const rawPoints = row[pointsIdx];
                const points = parseFloat(rawPoints) || 0;
                const timeSeconds = parseTimeToSeconds(rawTime);
                const score = points * 10000 - timeSeconds;
                return { name, score, rawTime, rawPoints: points, isTimerAndPoints: true, photo };
            } else {
                const rawScore = row[scoreIdx];
                const score = parseScore(rawScore);
                return { name, score, rawScore, isTimerAndPoints: false, photo };
            }
        })
        .filter(p => p.name)
        .sort((a, b) => b.score - a.score)
        .slice(0, config.topParticipants);

    if (participants.length > 0) {
        return { gameName, participants, isTimerAndPoints };
    }
    return null;
}

// ===== Render Functions =====
function renderCurrentGame() {
    if (gamesData.length === 0) return;

    const game = gamesData[currentGameIndex];
    const gameNameEl = document.getElementById('gameName');
    const participantsRow = document.getElementById('participantsRow');
    const scoreTable = document.getElementById('scoreTable');

    // Update game name
    gameNameEl.textContent = game.gameName.toUpperCase();
    gameNameEl.style.opacity = 0;
    setTimeout(() => {
        gameNameEl.style.transition = 'opacity 0.5s ease';
        gameNameEl.style.opacity = 1;
    }, 50);

    // Render participant cards (photo + name + score in each card)
    participantsRow.innerHTML = game.participants.map(p => {
        let scoreDisplay;
        if (p.isTimerAndPoints) {
            // timerAndPoints game - show both Points and Time
            const formattedTime = formatScoreForDisplay(p.rawTime);
            scoreDisplay = `
                <div class="participant-score">Points: ${p.rawPoints}</div>
                <div class="participant-score">Time: ${formattedTime}</div>
            `;
        } else {
            // Regular game - check if it's a time or points value
            const formattedScore = formatScoreForDisplay(p.rawScore);
            const isTimeFormat = isTimeValue(p.rawScore);
            if (isTimeFormat) {
                scoreDisplay = `<div class="participant-score">Time: ${formattedScore}</div>`;
            } else {
                scoreDisplay = `<div class="participant-score">Points: ${formattedScore}</div>`;
            }
        }

        return `
            <div class="participant-card">
                <div class="participant-photo">
                    <img src="${p.photo}" alt="${p.name}"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1a237e&color=fff&size=200'">
                </div>
                <div class="participant-name">${p.name}</div>
                ${scoreDisplay}
            </div>
        `;
    }).join('');

    // Hide score table
    scoreTable.innerHTML = '';
}

async function nextGame() {
    if (config.gameSheets.length === 0) return;
    const nextIndex = (currentGameIndex + 1) % config.gameSheets.length;
    await loadAndShowGame(nextIndex);
}

async function prevGame() {
    if (config.gameSheets.length === 0) return;
    const prevIndex = (currentGameIndex - 1 + config.gameSheets.length) % config.gameSheets.length;
    await loadAndShowGame(prevIndex);
}

// ===== Slideshow Controls =====
function startSlideshow() {
    if (isPlaying && config.gameSheets.length > 1) {
        slideInterval = setInterval(nextGame, config.slideDuration);
    }
    // Also start refreshing current game data periodically
    startCurrentGameRefresh();
}

function stopSlideshow() {
    clearInterval(slideInterval);
}

// Refresh current game data periodically (even when paused)
function startCurrentGameRefresh() {
    // Clear any existing interval
    if (currentGameRefreshInterval) {
        clearInterval(currentGameRefreshInterval);
    }
    // Refresh current game every 5 seconds
    currentGameRefreshInterval = setInterval(() => {
        if (config.gameSheets.length > 0) {
            refreshCurrentGame();
        }
    }, 5000);
}

// Refresh only the currently displayed game
async function refreshCurrentGame() {
    if (config.gameSheets.length === 0) return;

    const gameName = config.gameSheets[currentGameIndex];
    console.log(`Refreshing current game: ${gameName}`);

    try {
        const { data, actualName } = await fetchSheetDataFlexible(gameName);

        if (data.rows.length > 0) {
            const gameData = processGameData(data, actualName);
            if (gameData) {
                gamesData[currentGameIndex] = gameData;
                renderCurrentGame();
            }
        }
    } catch (error) {
        console.error(`Error refreshing game ${gameName}:`, error);
        // Keep showing cached data on error
    }
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('playPauseBtn');

    // Always keep current game refresh running (even when paused)
    startCurrentGameRefresh();
    btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

    if (isPlaying) {
        startSlideshow();
    } else {
        stopSlideshow();
    }
}

// ===== UI Helpers =====
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.toggle('show', show);
    }
}

function showNoData() {
    const gameNameEl = document.getElementById('gameName');
    const participantsRow = document.getElementById('participantsRow');
    const scoreTable = document.getElementById('scoreTable');

    gameNameEl.textContent = 'NO DATA AVAILABLE';
    participantsRow.innerHTML = '';
    scoreTable.innerHTML = '<div class="score-cell" style="color: #666;">No game data found</div>';
}

function showError() {
    const gameNameEl = document.getElementById('gameName');
    gameNameEl.textContent = 'ERROR LOADING DATA';
}

// ===== Initialize Controls =====
function initializeControls() {
    // Play/Pause
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);

    // Navigation
    document.getElementById('prevBtn').addEventListener('click', () => {
        prevGame();
        if (isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        nextGame();
        if (isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    });

    // Fullscreen
    document.getElementById('fullscreenBtn').addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            this.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });

    // Settings Panel Toggle
    document.getElementById('settingsToggle').addEventListener('click', function() {
        document.getElementById('settingsPanel').classList.toggle('active');
    });

    // Slide Duration Control
    const slideDuration = document.getElementById('slideDuration');
    const durationValue = document.getElementById('durationValue');

    slideDuration.addEventListener('input', function() {
        config.slideDuration = this.value * 1000;
        durationValue.textContent = this.value + 's';
        if (isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    });

    // Refresh Data Button
    document.getElementById('refreshData').addEventListener('click', function() {
        this.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';
        loadAllData().then(() => {
            this.innerHTML = '<i class="fas fa-sync"></i> Refresh Data';
        });
    });

    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case 'ArrowLeft':
                prevGame();
                if (isPlaying) { stopSlideshow(); startSlideshow(); }
                break;
            case 'ArrowRight':
                nextGame();
                if (isPlaying) { stopSlideshow(); startSlideshow(); }
                break;
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'f':
                document.getElementById('fullscreenBtn').click();
                break;
        }
    });
}

// Export for external use
window.GAMAZEScores = {
    loadAllData,
    config
};
