// ===== GAMAZE Scores Display System =====

// Configuration
const config = {
    spreadsheetId: '1C-07WttxU_PgzzobzYYjtwgYqOT3MIetkAsraShi5Us',
    participantsSheet: 'Participants',
    gamesListSheet: 'GamesList', // Sheet containing list of game names
    gameSheets: [], // Will be populated dynamically
    slideDuration: 5000, // 5 seconds per slide
    animationSpeed: 500,
    participantsPerSlide: 10,
    refreshInterval: 30000 // Refresh data every 30 seconds
};

// Color palette for game themes (matches CSS game-color classes)
const gameColors = [
    '6B46C1', // purple (game-color-0)
    'E53E3E', // red (game-color-1)
    '38A169', // green (game-color-2)
    'D69E2E', // yellow (game-color-3)
    '3182CE', // blue (game-color-4)
    'DD6B20'  // orange (game-color-5)
];

// State management
let currentSlide = 0;
let slides = [];
let isPlaying = true;
let slideInterval;
let participantsData = {}; // Map of name -> photo URL
let gamesData = []; // Array of { gameName, participants: [{name, score, photo}] }

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
    initializeSettings();
    showLoading(true);
    loadAllData();

    // Auto-refresh data
    setInterval(loadAllData, config.refreshInterval);
});

// ===== Google Sheets Data Fetching =====

// Fetch data from a specific sheet using Google Visualization API
async function fetchSheetData(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

    try {
        const response = await fetch(url);
        const text = await response.text();

        // Parse the JSONP response (remove the wrapper)
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const jsonString = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonString);

        if (data.table && data.table.rows) {
            // Get headers - use label, or id, or index as fallback
            let headers = data.table.cols.map((col, idx) => col.label || col.id || `col${idx}`);
            let rows = data.table.rows.map(row => {
                return row.c.map(cell => cell ? (cell.v !== null ? cell.v : '') : '');
            });

            // Check if first row looks like headers (contains common header names)
            if (rows.length > 0) {
                const firstRow = rows[0];
                const headerKeywords = ['name', 'photo', 'score', 'date', 'time', 'participant', 'url'];
                const looksLikeHeaders = firstRow.some(cell =>
                    typeof cell === 'string' && headerKeywords.some(kw => cell.toLowerCase().includes(kw))
                );

                if (looksLikeHeaders) {
                    // Use first row as headers and skip it from data
                    headers = firstRow.map(h => String(h));
                    rows = rows.slice(1);
                    console.log('Using first row as headers:', headers);
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

// Load participants data (name -> photo mapping)
async function loadParticipants() {
    const data = await fetchSheetData(config.participantsSheet);
    participantsData = {};

    console.log('Participants sheet headers:', data.headers);
    console.log('Participants sheet rows:', data.rows.length);

    if (data.rows.length > 0) {
        // Find column indices
        const nameIdx = findColumnIndex(data.headers, ['ParticipantName', 'Name', 'Participant']);
        const photoIdx = findColumnIndex(data.headers, ['PhotoUrl', 'Photo URL', 'Photo', 'URL', 'PhotoURL']);

        console.log('Name column index:', nameIdx, 'Photo column index:', photoIdx);

        data.rows.forEach(row => {
            const name = row[nameIdx] || '';
            let photo = row[photoIdx] || '';

            // Convert Google Drive links to direct image URLs
            if (photo && photo.includes('drive.google.com')) {
                const fileIdMatch = photo.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (fileIdMatch) {
                    // Use lh3.googleusercontent.com for reliable image loading
                    photo = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}=s200`;
                }
            }

            if (name) {
                participantsData[name.toLowerCase().trim()] = photo;
                console.log('Participant:', name, '-> Photo:', photo ? 'Yes' : 'No');
            }
        });
    }

    console.log('Loaded participants:', Object.keys(participantsData).length);
}

// Load all game data
async function loadGameData() {
    gamesData = [];

    console.log('Available participant photos:', Object.keys(participantsData));

    let gameIndex = 0;
    for (const gameName of config.gameSheets) {
        const { data, actualName } = await fetchSheetDataFlexible(gameName);
        const colorIndex = gameIndex % 6; // Calculate color index for this game
        const themeColor = gameColors[colorIndex];

        console.log(`Game "${actualName}" - headers:`, data.headers, 'rows:', data.rows.length);

        if (data.rows.length > 0) {
            const nameIdx = findColumnIndex(data.headers, ['ParticipantName', 'Name', 'Participant']);
            const scoreIdx = findColumnIndex(data.headers, ['Score', 'Points']);

            const participants = data.rows
                .map(row => {
                    const name = row[nameIdx] || '';
                    const score = parseInt(row[scoreIdx]) || 0;
                    const photoKey = name.toLowerCase().trim();
                    const photo = participantsData[photoKey];

                    console.log(`Looking up "${name}" -> key "${photoKey}" -> found: ${photo ? 'YES' : 'NO'}`);

                    const finalPhoto = photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=' + themeColor + '&color=fff&size=80';

                    return { name, score, photo: finalPhoto };
                })
                .filter(p => p.name) // Remove empty rows
                .sort((a, b) => b.score - a.score); // Sort by score descending

            // Assign ranks
            participants.forEach((p, idx) => {
                p.rank = idx + 1;
            });

            if (participants.length > 0) {
                gamesData.push({
                    gameName: actualName, // Use the actual matched sheet name
                    participants,
                    colorIndex: colorIndex
                });
                gameIndex++;
            }
        }
    }

    console.log('Loaded games:', gamesData.length);
}

// Helper: Find column index by possible names
function findColumnIndex(headers, possibleNames) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim();
        for (const name of possibleNames) {
            if (header === name.toLowerCase() || header.includes(name.toLowerCase())) {
                return i;
            }
        }
    }
    // Default to position-based if not found
    return possibleNames.includes('Score') ? 1 : 0;
}

// Normalize sheet name - trim spaces, handle case variations
function normalizeSheetName(name) {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' '); // Trim and normalize multiple spaces
}

// Try fetching sheet with different case variations
async function fetchSheetDataFlexible(sheetName) {
    const normalized = normalizeSheetName(sheetName);

    // Try exact name first
    let data = await fetchSheetData(normalized);
    if (data.rows.length > 0) return { data, actualName: normalized };

    // Try Title Case
    const titleCase = normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (titleCase !== normalized) {
        data = await fetchSheetData(titleCase);
        if (data.rows.length > 0) return { data, actualName: titleCase };
    }

    // Try lowercase
    const lower = normalized.toLowerCase();
    if (lower !== normalized) {
        data = await fetchSheetData(lower);
        if (data.rows.length > 0) return { data, actualName: lower };
    }

    // Try UPPERCASE
    const upper = normalized.toUpperCase();
    if (upper !== normalized) {
        data = await fetchSheetData(upper);
        if (data.rows.length > 0) return { data, actualName: upper };
    }

    console.warn(`Could not find sheet: "${sheetName}" (tried various cases)`);
    return { data: { headers: [], rows: [] }, actualName: normalized };
}

// Load game sheet names from GamesList sheet
async function loadGamesList() {
    const data = await fetchSheetData(config.gamesListSheet);
    config.gameSheets = [];

    console.log('GamesList headers:', data.headers);
    console.log('GamesList rows:', data.rows.length);

    if (data.rows.length > 0) {
        // First column contains game names
        data.rows.forEach(row => {
            const gameName = row[0];
            if (gameName && gameName.trim()) {
                config.gameSheets.push(normalizeSheetName(gameName));
            }
        });
    }

    console.log('Loaded game sheets:', config.gameSheets);
}

// Load all data and create slides
async function loadAllData() {
    try {
        await loadGamesList(); // First load the list of games
        await loadParticipants();
        await loadGameData();
        createSlides();
        showLoading(false);

        if (slides.length > 0 && isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showLoading(false);
        showError('Failed to load data. Please check the Google Sheet is public.');
    }
}

// ===== Create Slides =====
function createSlides() {
    const slidesWrapper = document.getElementById('slidesWrapper');
    slidesWrapper.innerHTML = '';

    if (gamesData.length === 0) {
        slidesWrapper.innerHTML = '<div class="no-data"><i class="fas fa-exclamation-circle"></i><p>No game data available</p></div>';
        return;
    }

    let slideIndex = 0;

    // Create slides for each game
    gamesData.forEach((game, gameIdx) => {
        // Split participants into groups of 4
        const chunks = chunkArray(game.participants, config.participantsPerSlide);

        chunks.forEach((group, groupIdx) => {
            const slide = document.createElement('div');
            slide.className = `slide ${slideIndex === 0 ? 'active' : ''} game-color-${game.colorIndex}`;

            const themeColor = gameColors[game.colorIndex];
            const participantsHtml = group.map(p => `
                <div class="participant-item">
                    <span class="participant-rank">#${p.rank}</span>
                    <div class="participant-photo-small">
                        <img src="${p.photo}" alt="${p.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=${themeColor}&color=fff&size=80'">
                    </div>
                    <span class="participant-name-small">${p.name}</span>
                    <span class="participant-score-small">${p.score} pts</span>
                </div>
            `).join('');

            slide.innerHTML = `
                <div class="game-slide">
                    <div class="game-header">
                        <h2 class="game-title"><i class="fas fa-trophy"></i> ${game.gameName}</h2>
                        <span class="slide-info">${groupIdx + 1} / ${chunks.length}</span>
                    </div>
                    <div class="participants-list">
                        ${participantsHtml}
                    </div>
                </div>
            `;

            slidesWrapper.appendChild(slide);
            slideIndex++;
        });
    });

    slides = document.querySelectorAll('.slide');
    currentSlide = 0;
    updateDots();
    updateLeaderboard();
}

// Helper: Split array into chunks
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// ===== Update Navigation Dots =====
function updateDots() {
    const dotsContainer = document.getElementById('dotsContainer');
    dotsContainer.innerHTML = '';

    slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.dataset.slide = index;
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
}

// ===== Update Leaderboard (Overall Top 5) =====
function updateLeaderboard() {
    const leaderboardList = document.querySelector('.leaderboard-list');
    if (!leaderboardList) return;

    leaderboardList.innerHTML = '';

    // Aggregate scores across all games
    const totalScores = {};
    gamesData.forEach(game => {
        game.participants.forEach(p => {
            const key = p.name.toLowerCase().trim();
            if (!totalScores[key]) {
                totalScores[key] = { name: p.name, score: 0 };
            }
            totalScores[key].score += p.score;
        });
    });

    // Sort and show top 5
    const sorted = Object.values(totalScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    sorted.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span class="rank">${idx + 1}</span>
            <span class="name">${p.name}</span>
            <span class="score">${p.score}</span>
        `;
        leaderboardList.appendChild(item);
    });
}

// ===== UI Helpers =====
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.toggle('show', show);
    }
}

function showError(message) {
    const slidesWrapper = document.getElementById('slidesWrapper');
    slidesWrapper.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>${message}</p></div>`;
}

// ===== Slideshow Controls =====
function startSlideshow() {
    if (isPlaying && slides.length > 0) {
        slideInterval = setInterval(() => {
            nextSlide();
        }, config.slideDuration);
    }
}

function stopSlideshow() {
    clearInterval(slideInterval);
}

function nextSlide() {
    if (slides.length === 0) return;

    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
    updateActiveDot();
}

function prevSlide() {
    if (slides.length === 0) return;

    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    updateActiveDot();
}

function goToSlide(index) {
    if (slides.length === 0 || index >= slides.length) return;

    slides[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    updateActiveDot();

    if (isPlaying) {
        stopSlideshow();
        startSlideshow();
    }
}

function updateActiveDot() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

// ===== Initialize Controls =====
function initializeControls() {
    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.addEventListener('click', function() {
        isPlaying = !isPlaying;
        this.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

        if (isPlaying) {
            startSlideshow();
        } else {
            stopSlideshow();
        }
    });

    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    fullscreenBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            this.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });

    // Navigation buttons
    document.getElementById('prevBtn').addEventListener('click', () => {
        prevSlide();
        if (isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        nextSlide();
        if (isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case 'ArrowLeft':
                prevSlide();
                break;
            case 'ArrowRight':
                nextSlide();
                break;
            case ' ':
                e.preventDefault();
                playPauseBtn.click();
                break;
            case 'f':
                fullscreenBtn.click();
                break;
        }
    });
}

// ===== Initialize Settings Panel =====
function initializeSettings() {
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsPanel = document.getElementById('settingsPanel');
    const slideDuration = document.getElementById('slideDuration');
    const durationValue = document.getElementById('durationValue');
    const showLeaderboard = document.getElementById('showLeaderboard');
    const refreshData = document.getElementById('refreshData');

    // Toggle settings panel
    settingsToggle.addEventListener('click', function() {
        settingsPanel.classList.toggle('active');
    });

    // Slide duration control
    slideDuration.addEventListener('input', function() {
        config.slideDuration = this.value * 1000;
        durationValue.textContent = this.value + 's';

        if (isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    });

    // Show/hide leaderboard
    showLeaderboard.addEventListener('change', function() {
        const leaderboardSummary = document.getElementById('leaderboardSummary');
        leaderboardSummary.classList.toggle('show', this.checked);
    });

    // Refresh data button
    refreshData.addEventListener('click', function() {
        this.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';

        loadAllData().then(() => {
            this.innerHTML = '<i class="fas fa-sync"></i> Refresh Data';
        });
    });
}

// ===== Configuration Helper =====
function addGameSheet(sheetName) {
    if (!config.gameSheets.includes(sheetName)) {
        config.gameSheets.push(sheetName);
    }
}

// Export for external use
window.GAMAZEScores = {
    loadAllData,
    addGameSheet,
    config
};
