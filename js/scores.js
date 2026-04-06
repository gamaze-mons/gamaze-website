// ===== GAMAZE Carnival Scores Display System =====
// With team support, rank-based scoring, and configurable display

// Configuration
const config = {
    spreadsheetId: '1C-07WttxU_PgzzobzYYjtwgYqOT3MIetkAsraShi5Us',
    apiKey: 'AIzaSyBHVyP4qX3-WA2t3lIo14KK3Nbg5aY6MGs',
    participantsSheet: 'Participants',
    gamesListSheet: 'GamesList',
    gameSheets: [],
    slideDuration: 8000,
    topParticipants: 5,
    participantsRefreshInterval: 60000,

    // Display flags
    showTopperPerGameOverall: true,
    showOverallToppers: true,
    showTeamRanks: true,
    showToppersPerTeam: true,
    showTopperPerTeamPerGame: false,

    // Rank counts
    teamRankCount: 5,
    individualRankCount: 5
};

// State
let allSlides = [];
let currentSlideIndex = 0;
let gamesData = [];
let participantsData = {};
let teamRankings = [];
let isPlaying = true;
let slideInterval;

// ===== Settings Persistence =====
const SETTINGS_KEY = 'gamaze_display_settings';

function saveSettings() {
    const settings = {
        slideDuration: config.slideDuration,
        showTopperPerGameOverall: config.showTopperPerGameOverall,
        showOverallToppers: config.showOverallToppers,
        showTeamRanks: config.showTeamRanks,
        showToppersPerTeam: config.showToppersPerTeam,
        showTopperPerTeamPerGame: config.showTopperPerTeamPerGame,
        teamRankCount: config.teamRankCount,
        individualRankCount: config.individualRankCount
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            Object.keys(settings).forEach(key => {
                if (config[key] !== undefined) config[key] = settings[key];
            });
        }
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initializeControls();
    showLoading(true);
    loadAllData();
    setInterval(loadAllData, config.participantsRefreshInterval);
});

// ===== Google Sheets API =====
async function fetchSheetData(sheetName) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${config.apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
            console.error(`API Error for "${sheetName}":`, data.error.message);
            return { headers: [], rows: [] };
        }
        if (data.values && data.values.length > 0) {
            return { headers: data.values[0], rows: data.values.slice(1) };
        }
        return { headers: [], rows: [] };
    } catch (error) {
        console.error(`Error fetching "${sheetName}":`, error);
        return { headers: [], rows: [] };
    }
}

// ===== Data Loading =====
async function loadParticipants() {
    const data = await fetchSheetData(config.participantsSheet);
    participantsData = {};

    if (data.rows.length > 0) {
        const nameIdx = findColumnIndex(data.headers, ['ParticipantName', 'Name', 'Participant']);
        const photoIdx = findColumnIndex(data.headers, ['PhotoUrl', 'Photo URL', 'Photo', 'URL', 'PhotoURL']);
        const teamIdx = findColumnIndex(data.headers, ['Team'], -1);

        data.rows.forEach(row => {
            const name = row[nameIdx] || '';
            let photo = row[photoIdx] || '';
            const team = (teamIdx >= 0 && row[teamIdx]) ? row[teamIdx] : '';

            if (photo && photo.includes('drive.google.com')) {
                const fileIdMatch = photo.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (fileIdMatch) {
                    photo = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
                }
            }

            if (name) {
                participantsData[name.toLowerCase().trim()] = { photo, team };
            }
        });
    }
}

async function loadGamesList() {
    const data = await fetchSheetData(config.gamesListSheet);
    config.gameSheets = [];

    if (data.rows.length > 0) {
        // Columns: Name, Description, ScoringMethod, MaxPoints
        data.rows.forEach(row => {
            const gameName = row[0];
            if (gameName && gameName.trim()) {
                const scoringMethod = (row[2] || 'points').toString().toLowerCase().trim();
                const sortOrder = (scoringMethod === 'stopwatch' || scoringMethod === 'timerace') ? 'asc' : 'desc';
                const maxPoints = parseFloat(row[3]) || 100;
                config.gameSheets.push({ name: gameName.trim(), sortOrder, scoringMethod, maxPoints });
            }
        });
    }
}

async function loadGameData() {
    gamesData = [];

    for (const gameConfig of config.gameSheets) {
        const data = await fetchSheetData(gameConfig.name);
        if (data.rows.length === 0) continue;

        const nameIdx = findColumnIndex(data.headers, ['ParticipantName', 'Name', 'Participant']);
        const scoreIdx = findColumnIndex(data.headers, ['Score', 'Points', 'PointsScored']);
        const timeIdx = findColumnIndex(data.headers, ['TimeTaken'], -1);
        const pointsIdx = findColumnIndex(data.headers, ['PointsScored'], -1);
        const npIdx = findColumnIndex(data.headers, ['NormalizedPoints'], -1);
        const isTimerAndPoints = gameConfig.scoringMethod === 'timerandpoints' && timeIdx >= 0 && pointsIdx >= 0;
        const maxPoints = gameConfig.maxPoints;

        const participants = data.rows
            .map(row => {
                const name = row[nameIdx] || '';
                const photoKey = name.toLowerCase().trim();
                const pData = participantsData[photoKey];
                const photo = (pData && pData.photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a237e&color=fff&size=150`;
                const team = (pData && pData.team) || '';

                const rawScore = row[scoreIdx];
                const rawTime = timeIdx >= 0 ? row[timeIdx] : null;
                const rawPoints = pointsIdx >= 0 ? row[pointsIdx] : null;

                // Use NormalizedPoints from sheet if available, otherwise calculate
                let normalizedPoints;
                if (npIdx >= 0 && row[npIdx] !== undefined && row[npIdx] !== '') {
                    normalizedPoints = parseFloat(row[npIdx]) || 0;
                } else {
                    // Fallback: calculate normalized points
                    if (isTimerAndPoints) {
                        const pts = rawPoints !== null ? (parseFloat(rawPoints) || 0) : 0;
                        normalizedPoints = Math.max(0, Math.round((pts / maxPoints) * 100));
                    } else if (gameConfig.sortOrder === 'asc') {
                        const time = rawTime !== null ? parseTimeToSeconds(rawTime) : parseTimeFromScore(rawScore);
                        normalizedPoints = Math.max(0, Math.round(((maxPoints - time) / maxPoints) * 100));
                    } else {
                        const pts = parseScoreNumeric(rawScore);
                        normalizedPoints = Math.max(0, Math.round((pts / maxPoints) * 100));
                    }
                }

                return { name, normalizedPoints, rawScore, photo, team };
            })
            .filter(p => p.name);

        // Sort by normalizedPoints descending (highest = best for all games)
        participants.sort((a, b) => b.normalizedPoints - a.normalizedPoints);
        participants.forEach((p, idx) => { p.rank = idx + 1; });

        if (participants.length > 0) {
            gamesData.push({
                gameName: gameConfig.name,
                participants,
                scoringMethod: gameConfig.scoringMethod,
                sortOrder: gameConfig.sortOrder
            });
        }
    }

    calculateTeamScores();
}

// ===== Score Parsing =====
function parseScoreNumeric(rawScore) {
    if (!rawScore) return 0;
    const str = String(rawScore).trim();
    const dateMatch = str.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) return parseInt(dateMatch[1]) * 60 + parseInt(dateMatch[2]);
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    return parseFloat(str) || 0;
}

function parseTimeToSeconds(rawTime) {
    if (!rawTime) return 0;
    const str = String(rawTime).trim();
    const dateMatch = str.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) return parseInt(dateMatch[1]) * 60 + parseInt(dateMatch[2]);
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    return parseFloat(str) || 0;
}

function parseTimeFromScore(rawScore) {
    if (!rawScore) return 0;
    const str = String(rawScore).trim();
    const dateMatch = str.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)$/i);
    if (dateMatch) return parseInt(dateMatch[1]) * 60 + parseInt(dateMatch[2]);
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    return 0;
}

function formatScoreForDisplay(p) {
    return `${p.normalizedPoints} pts`;
}

// ===== Column Helper =====
function findColumnIndex(headers, possibleNames, defaultIdx) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim().replace(/\s+/g, '');
        for (const name of possibleNames) {
            if (header === name.toLowerCase().replace(/\s+/g, '')) return i;
        }
    }
    if (defaultIdx !== undefined) return defaultIdx;
    return possibleNames.includes('Score') ? 1 : 0;
}

// ===== Team Calculations =====
function calculateTeamScores() {
    const teamData = {};
    gamesData.forEach(game => {
        game.participants.forEach(p => {
            if (!p.team) return;
            const key = p.team.toLowerCase().trim();
            if (!teamData[key]) teamData[key] = { teamName: p.team, totalPoints: 0, members: new Set() };
            teamData[key].totalPoints += p.normalizedPoints;
            teamData[key].members.add(p.name.toLowerCase().trim());
        });
    });

    teamRankings = Object.values(teamData)
        .map(t => ({ teamName: t.teamName, totalPoints: t.totalPoints, memberCount: t.members.size, rank: 0 }))
        .sort((a, b) => b.totalPoints - a.totalPoints); // Highest total points = best
    teamRankings.forEach((t, idx) => { t.rank = idx + 1; });
}

function getOverallIndividualRankings() {
    const pd = {};
    gamesData.forEach(game => {
        game.participants.forEach(p => {
            const key = p.name.toLowerCase().trim();
            if (!pd[key]) pd[key] = { name: p.name, photo: p.photo, team: p.team, totalPoints: 0 };
            pd[key].totalPoints += p.normalizedPoints;
        });
    });
    return Object.values(pd)
        .sort((a, b) => b.totalPoints - a.totalPoints); // Highest total = best
}

function getTeamToppers() {
    const ps = {};
    gamesData.forEach(game => {
        game.participants.forEach(p => {
            if (!p.team) return;
            const key = p.name.toLowerCase().trim();
            if (!ps[key]) ps[key] = { name: p.name, team: p.team, photo: p.photo, totalPoints: 0 };
            ps[key].totalPoints += p.normalizedPoints;
        });
    });

    const groups = {};
    Object.values(ps).forEach(p => {
        const key = p.team.toLowerCase().trim();
        if (!groups[key]) groups[key] = { teamName: p.team, members: [] };
        groups[key].members.push({ name: p.name, photo: p.photo, totalPoints: p.totalPoints });
    });

    return Object.values(groups)
        .map(t => { t.members.sort((a, b) => b.totalPoints - a.totalPoints); t.members = t.members.slice(0, config.individualRankCount); return t; })
        .sort((a, b) => (b.members[0]?.totalPoints || 0) - (a.members[0]?.totalPoints || 0));
}

// ===== Build Slide List =====
function buildSlideList() {
    allSlides = [];

    if (config.showTopperPerGameOverall) {
        gamesData.forEach(game => {
            const top = game.participants.slice(0, config.individualRankCount);
            if (top.length > 0) allSlides.push({ type: 'game', title: game.gameName.toUpperCase(), participants: top, game });
        });
    }

    if (config.showTopperPerTeamPerGame) {
        const teams = {};
        gamesData.forEach(g => g.participants.forEach(p => { if (p.team) teams[p.team.toLowerCase().trim()] = p.team; }));
        Object.values(teams).forEach(teamName => {
            const key = teamName.toLowerCase().trim();
            gamesData.forEach(game => {
                const members = game.participants.filter(p => p.team && p.team.toLowerCase().trim() === key).slice(0, config.individualRankCount);
                if (members.length > 0) {
                    allSlides.push({ type: 'teamGame', title: `${teamName} — ${game.gameName}`.toUpperCase(), participants: members.map((p, i) => ({ ...p, rank: i + 1 })), game });
                }
            });
        });
    }

    if (config.showOverallToppers) {
        const overall = getOverallIndividualRankings().slice(0, config.individualRankCount);
        if (overall.length > 0) allSlides.push({ type: 'overall', title: `OVERALL TOP ${config.individualRankCount}`, participants: overall.map((p, i) => ({ ...p, rank: i + 1 })) });
    }

    if (config.showToppersPerTeam) {
        getTeamToppers().forEach(team => {
            if (team.members.length > 0) allSlides.push({ type: 'teamToppers', title: `${team.teamName} — TOP PLAYERS`.toUpperCase(), participants: team.members.map((m, i) => ({ ...m, rank: i + 1 })) });
        });
    }

    if (config.showTeamRanks && teamRankings.length > 0) {
        allSlides.push({ type: 'teamRanks', title: 'TEAM RANKINGS', teams: teamRankings.slice(0, config.teamRankCount) });
    }
}

// ===== Render =====
function renderCurrentSlide() {
    if (allSlides.length === 0) {
        document.getElementById('gameName').textContent = 'NO DATA';
        document.getElementById('participantsRow').innerHTML = '<p style="color:#fff">No data for selected settings.</p>';
        return;
    }

    const slide = allSlides[currentSlideIndex];
    const gameNameEl = document.getElementById('gameName');
    const participantsRow = document.getElementById('participantsRow');

    gameNameEl.textContent = slide.title;
    gameNameEl.style.opacity = 0;
    setTimeout(() => { gameNameEl.style.transition = 'opacity 0.5s ease'; gameNameEl.style.opacity = 1; }, 50);

    if (slide.type === 'teamRanks') {
        participantsRow.innerHTML = slide.teams.map(t => `
            <div class="participant-card">
                <div class="participant-photo">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(t.teamName)}&background=6B46C1&color=fff&size=200" alt="${t.teamName}">
                </div>
                <div class="participant-name">${t.teamName}</div>
                <div class="participant-score">${t.totalPoints} pts</div>
            </div>
        `).join('');
        return;
    }

    participantsRow.innerHTML = slide.participants.map(p => {
        const photo = p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1a237e&color=fff&size=200`;
        const pts = p.normalizedPoints !== undefined ? p.normalizedPoints : (p.totalPoints || 0);
        return `
            <div class="participant-card">
                <div class="participant-photo">
                    <img src="${photo}" alt="${p.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1a237e&color=fff&size=200'">
                </div>
                <div class="participant-name">${p.name}</div>
                <div class="participant-score">${pts} pts</div>
            </div>
        `;
    }).join('');
}

// ===== Load All =====
async function loadAllData() {
    try {
        await loadGamesList();
        await loadParticipants();
        await loadGameData();
        buildSlideList();
        showLoading(false);
        if (allSlides.length > 0) {
            currentSlideIndex = 0;
            renderCurrentSlide();
            if (isPlaying) { stopSlideshow(); startSlideshow(); }
        } else {
            document.getElementById('gameName').textContent = 'NO DATA AVAILABLE';
            document.getElementById('participantsRow').innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showLoading(false);
        document.getElementById('gameName').textContent = 'ERROR LOADING DATA';
    }
}

// ===== Slideshow =====
function startSlideshow() { if (isPlaying && allSlides.length > 1) slideInterval = setInterval(nextSlide, config.slideDuration); }
function stopSlideshow() { clearInterval(slideInterval); }
function nextSlide() { if (allSlides.length === 0) return; currentSlideIndex = (currentSlideIndex + 1) % allSlides.length; renderCurrentSlide(); }
function prevSlide() { if (allSlides.length === 0) return; currentSlideIndex = (currentSlideIndex - 1 + allSlides.length) % allSlides.length; renderCurrentSlide(); }
function togglePlayPause() {
    isPlaying = !isPlaying;
    document.getElementById('playPauseBtn').innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    if (isPlaying) startSlideshow(); else stopSlideshow();
}

function showLoading(show) { const el = document.getElementById('loadingState'); if (el) el.classList.toggle('show', show); }

// ===== Controls =====
function initializeControls() {
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('prevBtn').addEventListener('click', () => { prevSlide(); if (isPlaying) { stopSlideshow(); startSlideshow(); } });
    document.getElementById('nextBtn').addEventListener('click', () => { nextSlide(); if (isPlaying) { stopSlideshow(); startSlideshow(); } });
    document.getElementById('fullscreenBtn').addEventListener('click', function() {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); this.innerHTML = '<i class="fas fa-compress"></i>'; }
        else { document.exitFullscreen(); this.innerHTML = '<i class="fas fa-expand"></i>'; }
    });
    document.getElementById('settingsToggle').addEventListener('click', () => document.getElementById('settingsPanel').classList.toggle('active'));

    const slideDuration = document.getElementById('slideDuration');
    const durationValue = document.getElementById('durationValue');
    slideDuration.value = config.slideDuration / 1000;
    durationValue.textContent = (config.slideDuration / 1000) + 's';
    slideDuration.addEventListener('input', function() {
        config.slideDuration = this.value * 1000;
        durationValue.textContent = this.value + 's';
        saveSettings();
        if (isPlaying) { stopSlideshow(); startSlideshow(); }
    });

    document.querySelectorAll('.display-toggle').forEach(toggle => {
        const key = toggle.dataset.config;
        if (key && config[key] !== undefined) toggle.checked = config[key];
        toggle.addEventListener('change', function() {
            config[this.dataset.config] = this.checked;
            saveSettings();
            buildSlideList();
            currentSlideIndex = 0;
            renderCurrentSlide();
            if (isPlaying) { stopSlideshow(); startSlideshow(); }
        });
    });

    document.querySelectorAll('.rank-count').forEach(input => {
        const key = input.dataset.config;
        if (key && config[key] !== undefined) input.value = config[key];
        input.addEventListener('change', function() {
            config[this.dataset.config] = parseInt(this.value) || 1;
            saveSettings();
            buildSlideList();
            currentSlideIndex = 0;
            renderCurrentSlide();
            if (isPlaying) { stopSlideshow(); startSlideshow(); }
        });
    });

    document.getElementById('refreshData').addEventListener('click', function() {
        this.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';
        loadAllData().then(() => { this.innerHTML = '<i class="fas fa-sync"></i> Refresh Data'; });
    });

    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case 'ArrowLeft': prevSlide(); if (isPlaying) { stopSlideshow(); startSlideshow(); } break;
            case 'ArrowRight': nextSlide(); if (isPlaying) { stopSlideshow(); startSlideshow(); } break;
            case ' ': e.preventDefault(); togglePlayPause(); break;
            case 'f': document.getElementById('fullscreenBtn').click(); break;
        }
    });
}

window.GAMAZEScores = { loadAllData, config };
