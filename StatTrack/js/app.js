/**
 * Main Application 
 */

// Add this to the top of your app.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
} 


// Handle team colors consistently throughout the app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the database
    DB.init();
    
    // Check for saved game and offer to resume
    checkForSavedGame();
    
    // Set up navigation
    setupNavigation();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize teams data
    loadTeamsData();
    
    // Load screen-specific CSS
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) {
        const screenId = activeScreen.id.replace('-screen', '');
        loadScreenCSS(screenId);
    }
    
    // Load saved team colors
    loadSavedTeamColors();
});

/**
 * Check for a saved game and offer to resume
 */
function checkForSavedGame() {
    const savedGame = DB.getCurrentGame();
    
    if (savedGame) {
        if (confirm('You have a game in progress. Would you like to resume?')) {
            GameTracker.resumeGame();
            navigateToScreen('game');
        }
    }
}

/**
 * Navigate to a specific screen
 * @param {String} screenId - ID of the screen to show
 */
// In navigateToScreen function
function navigateToScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the target screen
    const targetScreen = document.getElementById(screenId + '-screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
        
        // Auto-load home team box score
        if (screenId === 'boxscore') {
            renderBoxScore('home');
            
            // Update toggle buttons
            document.querySelectorAll('.team-toggle .toggle-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.team === 'home') {
                    btn.classList.add('active');
                }
            });
        }
    }
    
    // Update active navigation button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.screen === screenId) {
            btn.classList.add('active');
        }
    });
    
    // Load screen-specific CSS
    loadScreenCSS(screenId);
}

/**
 * Load screen-specific CSS
 * @param {String} screenId - ID of the screen
 */
function loadScreenCSS(screenId) {
    // Implementation depends on your specific requirements
    // This can be a placeholder if you're not using dynamic CSS loading
    console.log(`Loading CSS for ${screenId} screen`);
}

/**
 * Set up navigation event listeners
 */
// In the setupNavigation function
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const screenId = btn.dataset.screen;
            navigateToScreen(screenId);
            
            // Load screen-specific data
            if (screenId === 'dashboard') {
                renderDashboard();
            } else if (screenId === 'boxscore') {
                renderBoxScore('home'); // Default to home team
            }
        });
    });
}

/**
 * Set up event listeners for the app
 */
function setupEventListeners() {
    // Game setup event listeners
    const addHomePlayerBtn = document.getElementById('add-home-player');
    if (addHomePlayerBtn) {
        addHomePlayerBtn.addEventListener('click', addHomePlayer);
    }
    
    const addAwayPlayerBtn = document.getElementById('add-away-player');
    if (addAwayPlayerBtn) {
        addAwayPlayerBtn.addEventListener('click', addAwayPlayer);
    }
    
    const startGameBtn = document.getElementById('start-game');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    // Add event listeners for team colors
    const homeTeamColor = document.getElementById('home-team-color');
    if (homeTeamColor) {
        homeTeamColor.addEventListener('change', function() {
            document.documentElement.style.setProperty('--home-team', this.value);
            document.documentElement.style.setProperty('--home-color', this.value);
            localStorage.setItem('home-team-color', this.value);
        });
    }
    
    const awayTeamColor = document.getElementById('away-team-color');
    if (awayTeamColor) {
        awayTeamColor.addEventListener('change', function() {
            document.documentElement.style.setProperty('--away-team', this.value);
            document.documentElement.style.setProperty('--away-color', this.value);
            localStorage.setItem('away-team-color', this.value);
        });
    }
    
    // Box score toggle
    document.querySelectorAll('.team-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const teamType = this.dataset.team;
            document.querySelectorAll('.team-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderBoxScore(teamType);
        });
    });
    
    // Game control buttons
    const endPeriodBtn = document.getElementById('end-period');
    if (endPeriodBtn) {
        endPeriodBtn.addEventListener('click', () => GameTracker.endPeriod());
    }
    
    const endGameBtn = document.getElementById('end-game');
    if (endGameBtn) {
        endGameBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to end the game?')) {
                GameTracker.endGame();
                navigateToScreen('boxscore');
            }
        });
    }
    
    // Stat buttons
    document.querySelectorAll('.stat-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const statType = this.dataset.stat;
            GameTracker.recordStat(statType);
        });
    });
}

/**
 * Load teams data from storage
 */
function loadTeamsData() {
    const teams = DB.getTeams();
    
    // Populate team dropdowns
    const homeTeamSelect = document.getElementById('home-team-select');
    const awayTeamSelect = document.getElementById('away-team-select');
    
    if (homeTeamSelect && awayTeamSelect) {
        // Clear existing options except the first one
        while (homeTeamSelect.options.length > 1) {
            homeTeamSelect.remove(1);
        }
        
        while (awayTeamSelect.options.length > 1) {
            awayTeamSelect.remove(1);
        }
        
        // Add team options
        teams.forEach(team => {
            const homeOption = document.createElement('option');
            homeOption.value = team.name;
            homeOption.textContent = team.name;
            homeTeamSelect.appendChild(homeOption);
            
            const awayOption = document.createElement('option');
            awayOption.value = team.name;
            awayOption.textContent = team.name;
            awayTeamSelect.appendChild(awayOption);
        });
    }
}

// These functions might be needed too
function addHomePlayer() {
    const container = document.getElementById('home-players');
    if (container) {
        const playerEntry = document.createElement('div');
        playerEntry.className = 'player-entry';
        playerEntry.innerHTML = `
            <input type="number" placeholder="#" class="player-number">
            <input type="text" placeholder="Player Name" class="player-name">
        `;
        container.appendChild(playerEntry);
    }
}

function addAwayPlayer() {
    const container = document.getElementById('away-players');
    if (container) {
        const playerEntry = document.createElement('div');
        playerEntry.className = 'player-entry';
        playerEntry.innerHTML = `
            <input type="number" placeholder="#" class="player-number">
            <input type="text" placeholder="Player Name" class="player-name">
        `;
        container.appendChild(playerEntry);
    }
}

function startGame() {
    // Get team names
    const homeTeamName = document.getElementById('home-team').value || 'Home Team';
    const awayTeamName = document.getElementById('away-team').value || 'Away Team';
    
    // Get home team players
    const homePlayers = [];
    const homePlayerRows = document.querySelectorAll('#home-players .player-entry');
    
    homePlayerRows.forEach(row => {
        const numberInput = row.querySelector('.player-number');
        const nameInput = row.querySelector('.player-name');
        
        if (nameInput && nameInput.value) {
            homePlayers.push({
                number: numberInput ? numberInput.value : '0',
                name: nameInput.value
            });
        }
    });
    
    // Get away team players
    const awayPlayers = [];
    const awayPlayerRows = document.querySelectorAll('#away-players .player-entry');
    
    awayPlayerRows.forEach(row => {
        const numberInput = row.querySelector('.player-number');
        const nameInput = row.querySelector('.player-name');
        
        if (nameInput && nameInput.value) {
            awayPlayers.push({
                number: numberInput ? numberInput.value : '0',
                name: nameInput.value
            });
        }
    });
    
    // If no players were added, add some sample players
    if (homePlayers.length === 0) {
        homePlayers.push({ number: '1', name: 'Home Player 1' });
        homePlayers.push({ number: '2', name: 'Home Player 2' });
    }
    
    if (awayPlayers.length === 0) {
        awayPlayers.push({ number: '1', name: 'Away Player 1' });
        awayPlayers.push({ number: '2', name: 'Away Player 2' });
    }
    
    // Create game data object
    const gameData = {
        date: document.getElementById('game-date').value || new Date().toISOString().split('T')[0],
        location: document.getElementById('game-location').value || '',
        homeTeam: {
            name: homeTeamName,
            players: homePlayers
        },
        awayTeam: {
            name: awayTeamName,
            players: awayPlayers
        }
    };
    
    console.log("Starting game with data:", gameData);
    
    // Initialize game tracker
    GameTracker.initGame(gameData);
    
    // Navigate to game screen
    navigateToScreen('game');
}
// Function to load saved team colors and apply them
function loadSavedTeamColors() {
    const savedHomeColor = localStorage.getItem('home-team-color') || '#0A254E';
    const savedAwayColor = localStorage.getItem('away-team-color') || '#75ACD8';
    
    // Set CSS variables consistently
    document.documentElement.style.setProperty('--home-color', savedHomeColor);
    document.documentElement.style.setProperty('--away-color', savedAwayColor);
    document.documentElement.style.setProperty('--home-color', savedHomeColor);
    document.documentElement.style.setProperty('--away-color', savedAwayColor);
    
    // Update dropdowns to match
    const homeDropdown = document.getElementById('home-team-color');
    if (homeDropdown) homeDropdown.value = savedHomeColor;
    
    const awayDropdown = document.getElementById('away-team-color');
    if (awayDropdown) awayDropdown.value = savedAwayColor;
}

// Update the existing color dropdown event listeners
document.getElementById('home-team-color').addEventListener('change', function() {
    document.documentElement.style.setProperty('--home-color', this.value);
    document.documentElement.style.setProperty('--home-color', this.value);
    localStorage.setItem('home-team-color', this.value);
});

document.getElementById('away-team-color').addEventListener('change', function() {
    document.documentElement.style.setProperty('--away-color', this.value);
    document.documentElement.style.setProperty('--away-color', this.value);
    localStorage.setItem('away-team-color', this.value);
});

// HTML Template for the player selected indicator
// This will be added dynamically after the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add the player selected indicator to the stat buttons container
    const statButtonsContainer = document.getElementById('stat-buttons-container');
    
    if (statButtonsContainer) {
        const indicator = document.createElement('div');
        indicator.id = 'player-selected-indicator';
        indicator.className = 'player-selected-indicator';
        indicator.textContent = 'No player selected';
        
        // Insert at the beginning of the container
        statButtonsContainer.insertBefore(indicator, statButtonsContainer.firstChild);
    }
    
    // Add "End Possession" button to the special button group
    const specialButtonGroup = document.querySelector('.button-group.special');
    
    if (specialButtonGroup) {
        const endPossessionBtn = document.createElement('button');
        endPossessionBtn.className = 'stat-btn';
        endPossessionBtn.dataset.stat = 'endPossession';
        endPossessionBtn.textContent = 'END POSS';
        
        // Insert between Paint Touch and Undo
        const undoBtn = specialButtonGroup.querySelector('[data-stat="undo"]');
        if (undoBtn) {
            specialButtonGroup.insertBefore(endPossessionBtn, undoBtn);
        } else {
            specialButtonGroup.appendChild(endPossessionBtn);
        }
    }
    
    // Update the box score table header to remove minutes and plus-minus columns
    const boxScoreHeader = document.querySelector('#box-score-table thead tr');
    
    if (boxScoreHeader) {
        // Remove minutes column (index 1)
        const minutesColumn = boxScoreHeader.querySelector('th:nth-child(2)');
        if (minutesColumn && minutesColumn.textContent.trim() === 'MIN') {
            minutesColumn.remove();
        }
        
        // Remove plus-minus column (last column)
        const plusMinusColumn = boxScoreHeader.querySelector('th:last-child');
        if (plusMinusColumn && plusMinusColumn.textContent.trim() === '+/-') {
            plusMinusColumn.remove();
        }
    }

        // Ensure player selected indicator is visible
        const playerSelectedIndicator = document.getElementById('player-selected-indicator');
        if (playerSelectedIndicator) {
            playerSelectedIndicator.style.display = 'block';
            if (!GameTracker.homeSelectedPlayer && !GameTracker.awaySelectedPlayer) {
                playerSelectedIndicator.textContent = 'No player selected';
                playerSelectedIndicator.style.backgroundColor = '#ececec'; // Neutral color
            }
        }
});
