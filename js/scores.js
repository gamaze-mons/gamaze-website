// ===== Scores Display System =====

// Configuration
const config = {
    slideDuration: 5000, // 5 seconds per slide
    animationSpeed: 500,
    googleSheetsApiKey: 'YOUR_API_KEY_HERE', // Replace with actual API key
    spreadsheetId: 'YOUR_SPREADSHEET_ID_HERE', // Replace with actual spreadsheet ID
    sheetName: 'Sheet1',
    refreshInterval: 30000 // Refresh data every 30 seconds
};

// State management
let currentSlide = 0;
let slides = [];
let isPlaying = true;
let slideInterval;
let participantsData = [];

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
    initializeSettings();
    loadSampleData(); // Load sample data initially
    startSlideshow();
    
    // Comment out for now - will be activated when Google Sheets is configured
    // loadGoogleSheetsData();
    // setInterval(loadGoogleSheetsData, config.refreshInterval);
});

// ===== Sample Data (Replace with Google Sheets data) =====
function loadSampleData() {
    participantsData = [
        {
            name: 'John Doe',
            photo: 'https://via.placeholder.com/200',
            score: 850,
            rank: 1,
            badge: 'Top Performer'
        },
        {
            name: 'Jane Smith',
            photo: 'https://via.placeholder.com/200',
            score: 720,
            rank: 2,
            badge: 'On Fire'
        },
        {
            name: 'Mike Johnson',
            photo: 'https://via.placeholder.com/200',
            score: 650,
            rank: 3,
            badge: 'Rising Star'
        },
        {
            name: 'Sarah Williams',
            photo: 'https://via.placeholder.com/200',
            score: 580,
            rank: 4,
            badge: 'Consistent Player'
        },
        {
            name: 'David Brown',
            photo: 'https://via.placeholder.com/200',
            score: 520,
            rank: 5,
            badge: 'Team Player'
        }
    ];
    
    createSlides();
    updateLeaderboard();
}

// ===== Google Sheets Integration =====
async function loadGoogleSheetsData() {
    try {
        // Hide loading state
        document.getElementById('loadingState').classList.remove('show');
        
        // Construct the API URL
        const range = `${config.sheetName}!A:C`; // Columns A (Name), B (Photo URL), C (Score)
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}?key=${config.googleSheetsApiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data from Google Sheets');
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            // Skip header row and process data
            participantsData = data.values.slice(1).map((row, index) => ({
                name: row[0] || 'Unknown',
                photo: row[1] || 'https://via.placeholder.com/200',
                score: parseInt(row[2]) || 0,
                rank: 0, // Will be calculated
                badge: '' // Will be assigned
            }));
            
            // Sort by score and assign ranks
            participantsData.sort((a, b) => b.score - a.score);
            participantsData.forEach((participant, index) => {
                participant.rank = index + 1;
                participant.badge = getBadgeForRank(index + 1);
            });
            
            createSlides();
            updateLeaderboard();
        }
    } catch (error) {
        console.error('Error loading Google Sheets data:', error);
        // Fall back to sample data if there's an error
        if (participantsData.length === 0) {
            loadSampleData();
        }
    }
}

// ===== Helper Functions =====
function getBadgeForRank(rank) {
    const badges = {
        1: 'Top Performer',
        2: 'On Fire',
        3: 'Rising Star',
        4: 'Consistent Player',
        5: 'Team Player'
    };
    return badges[rank] || 'Participant';
}

function getBadgeIcon(badge) {
    const icons = {
        'Top Performer': 'fas fa-star',
        'On Fire': 'fas fa-fire',
        'Rising Star': 'fas fa-medal',
        'Consistent Player': 'fas fa-award',
        'Team Player': 'fas fa-users',
        'Participant': 'fas fa-user'
    };
    return icons[badge] || 'fas fa-user';
}

// ===== Create Slides from Data =====
function createSlides() {
    const slidesWrapper = document.getElementById('slidesWrapper');
    slidesWrapper.innerHTML = '';
    
    participantsData.forEach((participant, index) => {
        const slide = document.createElement('div');
        slide.className = `slide ${index === 0 ? 'active' : ''}`;
        
        const maxScore = Math.max(...participantsData.map(p => p.score));
        const scorePercentage = (participant.score / maxScore) * 100;
        
        slide.innerHTML = `
            <div class="participant-card">
                <div class="rank-badge">#${participant.rank}</div>
                <div class="participant-photo">
                    <img src="${participant.photo}" alt="${participant.name}" onerror="this.src='https://via.placeholder.com/200'">
                    <div class="photo-ring"></div>
                </div>
                <h2 class="participant-name">${participant.name}</h2>
                <div class="score-display">
                    <span class="score-label">Score</span>
                    <span class="score-value" data-score="${participant.score}">${participant.score}</span>
                    <span class="score-points">points</span>
                </div>
                <div class="score-bar">
                    <div class="score-progress" style="width: ${scorePercentage}%"></div>
                </div>
                <div class="achievement-badges">
                    <span class="badge">
                        <i class="${getBadgeIcon(participant.badge)}"></i> ${participant.badge}
                    </span>
                </div>
            </div>
        `;
        
        slidesWrapper.appendChild(slide);
    });
    
    slides = document.querySelectorAll('.slide');
    updateDots();
}

// ===== Update Navigation Dots =====
function updateDots() {
    const dotsContainer = document.getElementById('dotsContainer');
    dotsContainer.innerHTML = '';
    
    participantsData.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.dataset.slide = index;
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
}

// ===== Update Leaderboard =====
function updateLeaderboard() {
    const leaderboardList = document.querySelector('.leaderboard-list');
    leaderboardList.innerHTML = '';
    
    // Show top 5 participants
    participantsData.slice(0, 5).forEach(participant => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span class="rank">${participant.rank}</span>
            <span class="name">${participant.name}</span>
            <span class="score">${participant.score}</span>
        `;
        leaderboardList.appendChild(item);
    });
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
    animateScoreCounter();
}

function prevSlide() {
    if (slides.length === 0) return;
    
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    updateActiveDot();
    animateScoreCounter();
}

function goToSlide(index) {
    if (slides.length === 0 || index >= slides.length) return;
    
    slides[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    updateActiveDot();
    animateScoreCounter();
    
    // Restart slideshow from this slide
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

// ===== Score Counter Animation =====
function animateScoreCounter() {
    const activeSlide = slides[currentSlide];
    if (!activeSlide) return;
    
    const scoreElement = activeSlide.querySelector('.score-value');
    if (!scoreElement) return;
    
    const targetScore = parseInt(scoreElement.dataset.score);
    let currentScore = 0;
    const increment = targetScore / 50;
    const timer = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            scoreElement.textContent = targetScore;
            clearInterval(timer);
        } else {
            scoreElement.textContent = Math.floor(currentScore);
        }
    }, 20);
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
    const animationSpeed = document.getElementById('animationSpeed');
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
    
    // Animation speed control
    animationSpeed.addEventListener('change', function() {
        const speeds = {
            slow: 800,
            normal: 500,
            fast: 300
        };
        config.animationSpeed = speeds[this.value];
        
        // Update CSS transition duration
        document.querySelectorAll('.slide').forEach(slide => {
            slide.style.transition = `all ${config.animationSpeed}ms ease`;
        });
    });
    
    // Show/hide leaderboard
    showLeaderboard.addEventListener('change', function() {
        const leaderboardSummary = document.getElementById('leaderboardSummary');
        leaderboardSummary.classList.toggle('show', this.checked);
    });
    
    // Refresh data button
    refreshData.addEventListener('click', function() {
        this.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';
        
        // Simulate data refresh (replace with actual Google Sheets call)
        setTimeout(() => {
            loadSampleData(); // or loadGoogleSheetsData()
            this.innerHTML = '<i class="fas fa-sync"></i> Refresh Data';
        }, 1000);
    });
}

// ===== Google Sheets Configuration Helper =====
function setupGoogleSheets(apiKey, spreadsheetId) {
    config.googleSheetsApiKey = apiKey;
    config.spreadsheetId = spreadsheetId;
    loadGoogleSheetsData();
}

// Export for external use
window.GamezScores = {
    setupGoogleSheets,
    loadGoogleSheetsData,
    refreshData: loadGoogleSheetsData
};