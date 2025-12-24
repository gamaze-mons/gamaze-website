// ===== GAMAZE Carnival Scores Display System =====

// Configuration
const config = {
    spreadsheetId: '1C-07WttxU_PgzzobzYYjtwgYqOT3MIetkAsraShi5Us',
    participantsSheet: 'Participants',
    gamesListSheet: 'GamesList',
    gameSheets: [],
    slideDuration: 8000, // 8 seconds per slide
    topParticipants: 5, // Show top 5 per game
    refreshInterval: 30000
};

// State
let currentGameIndex = 0;
let gamesData = [];
let participantsData = {};
let isPlaying = true;
let slideInterval;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
    showLoading(true);
    loadAllData();
    setInterval(loadAllData, config.refreshInterval);
});

// ===== Google Sheets Data Fetching =====
async function fetchSheetData(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

    try {
        const response = await fetch(url);
        const text = await response.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const jsonString = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonString);

        if (data.table && data.table.rows) {
            let headers = data.table.cols.map((col, idx) => col.label || col.id || `col${idx}`);
            let rows = data.table.rows.map(row => {
                return row.c.map(cell => cell ? (cell.v !== null ? cell.v : '') : '');
            });

            if (rows.length > 0) {
                const firstRow = rows[0];
                const headerKeywords = ['name', 'photo', 'score', 'date', 'time', 'participant', 'url'];
                const looksLikeHeaders = firstRow.some(cell =>
                    typeof cell === 'string' && headerKeywords.some(kw => cell.toLowerCase().includes(kw))
                );

                if (looksLikeHeaders) {
                    headers = firstRow.map(h => String(h));
                    rows = rows.slice(1);
                }
            }

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

// Try fetching with different case variations
async function fetchSheetDataFlexible(sheetName) {
    const normalized = sheetName.trim().replace(/\s+/g, ' ');

    let data = await fetchSheetData(normalized);
    if (data.rows.length > 0) return { data, actualName: normalized };

    const titleCase = normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (titleCase !== normalized) {
        data = await fetchSheetData(titleCase);
        if (data.rows.length > 0) return { data, actualName: titleCase };
    }

    const lower = normalized.toLowerCase();
    if (lower !== normalized) {
        data = await fetchSheetData(lower);
        if (data.rows.length > 0) return { data, actualName: lower };
    }

    const upper = normalized.toUpperCase();
    if (upper !== normalized) {
        data = await fetchSheetData(upper);
        if (data.rows.length > 0) return { data, actualName: upper };
    }

    return { data: { headers: [], rows: [] }, actualName: normalized };
}

// Load all game data
async function loadGameData() {
    gamesData = [];

    for (const gameName of config.gameSheets) {
        const { data, actualName } = await fetchSheetDataFlexible(gameName);

        if (data.rows.length > 0) {
            const nameIdx = findColumnIndex(data.headers, ['ParticipantName', 'Name', 'Participant']);
            const scoreIdx = findColumnIndex(data.headers, ['Score', 'Points']);

            const participants = data.rows
                .map(row => {
                    const name = row[nameIdx] || '';
                    const rawScore = row[scoreIdx];
                    const score = parseScore(rawScore);
                    const photoKey = name.toLowerCase().trim();
                    const photo = participantsData[photoKey] ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a237e&color=fff&size=150`;

                    return { name, score, rawScore, photo };
                })
                .filter(p => p.name)
                .sort((a, b) => b.score - a.score)
                .slice(0, config.topParticipants); // Top 5 only

            if (participants.length > 0) {
                gamesData.push({
                    gameName: actualName,
                    participants
                });
            }
        }
    }
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
    const dateMatch = scoreStr.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) {
        const hours = parseInt(dateMatch[1]) || 0;
        const minutes = parseInt(dateMatch[2]) || 0;
        const seconds = parseInt(dateMatch[3]) || 0;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
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
    const dateMatch = scoreStr.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) {
        const hours = parseInt(dateMatch[1]) || 0;
        const minutes = parseInt(dateMatch[2]) || 0;
        const seconds = parseInt(dateMatch[3]) || 0;
        // Format as MM:SS or HH:MM:SS
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Return as-is for other formats
    return scoreStr;
}

// Load all data
async function loadAllData() {
    try {
        await loadGamesList();
        await loadParticipants();
        await loadGameData();
        showLoading(false);

        if (gamesData.length > 0) {
            renderCurrentGame();
            if (isPlaying) {
                stopSlideshow();
                startSlideshow();
            }
        } else {
            showNoData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showLoading(false);
        showError();
    }
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
    participantsRow.innerHTML = game.participants.map(p => `
        <div class="participant-card">
            <div class="participant-photo">
                <img src="${p.photo}" alt="${p.name}"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1a237e&color=fff&size=200'">
            </div>
            <div class="participant-name">${p.name}</div>
            <div class="participant-score">Score: ${formatScoreForDisplay(p.rawScore)}</div>
        </div>
    `).join('');

    // Hide score table
    scoreTable.innerHTML = '';
}

function nextGame() {
    if (gamesData.length === 0) return;
    currentGameIndex = (currentGameIndex + 1) % gamesData.length;
    renderCurrentGame();
}

function prevGame() {
    if (gamesData.length === 0) return;
    currentGameIndex = (currentGameIndex - 1 + gamesData.length) % gamesData.length;
    renderCurrentGame();
}

// ===== Slideshow Controls =====
function startSlideshow() {
    if (isPlaying && gamesData.length > 1) {
        slideInterval = setInterval(nextGame, config.slideDuration);
    }
}

function stopSlideshow() {
    clearInterval(slideInterval);
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('playPauseBtn');
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
