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
function navigateToScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the target screen
    const targetScreen = document.getElementById(screenId + '-screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
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
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const screenId = btn.dataset.screen;
            navigateToScreen(screenId);
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

/**
 * Shot Chart Visualization Component
 * Renders a basketball court with shot data visualization
 */
function renderShotChart(shotData, team = 'all', filter = 'all') {
    const shotChartContainer = document.getElementById('shot-chart');
    if (!shotChartContainer) return;
    
    // Clear existing content
    shotChartContainer.innerHTML = '';
    
    // Create the court diagram
    const courtDiv = document.createElement('div');
    courtDiv.className = 'dashboard-court';
    
    // Create the SVG for the basketball court
    courtDiv.innerHTML = `
        <svg viewBox="0 0 500 470" class="basketball-court">
            <!-- Court outline -->
            <rect x="0" y="0" width="500" height="470" fill="#f8f8f8" stroke="#666" stroke-width="2" />
            
            <!-- Half court line -->
            <line x1="0" y1="235" x2="500" y2="235" stroke="#666" stroke-width="2" />
            
            <!-- Center circle -->
            <circle cx="250" cy="235" r="60" fill="none" stroke="#666" stroke-width="2" />
            
            <!-- Free throw circles and lines -->
            <circle cx="250" cy="155" r="60" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" />
            <circle cx="250" cy="315" r="60" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" />
            
            <!-- Baskets -->
            <circle cx="250" cy="30" r="7.5" fill="none" stroke="#666" stroke-width="2" />
            <circle cx="250" cy="440" r="7.5" fill="none" stroke="#666" stroke-width="2" />
            
            <!-- Free throw lanes -->
            <rect x="180" y="30" width="140" height="125" fill="none" stroke="#666" stroke-width="2" />
            <rect x="180" y="315" width="140" height="125" fill="none" stroke="#666" stroke-width="2" />
            
            <!-- Three point lines -->
            <path d="M 30,30 A 220,220 0 0 1 470,30" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" />
            <path d="M 30,440 A 220,220 0 0 0 470,440" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" />
            
            <!-- Shot zones (invisible for reference) -->
            <!-- Rim area -->
            <circle cx="250" cy="30" r="40" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="rim" />
            <circle cx="250" cy="440" r="40" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="rim" />
            
            <!-- Paint area -->
            <rect x="180" y="30" width="140" height="125" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="paint-far" />
            <rect x="180" y="315" width="140" height="125" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="paint-far" />
            
            <!-- Mid-range areas -->
            <path d="M 100,30 L 180,30 L 180,155 L 100,155 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="midrange-left" />
            <path d="M 320,30 L 400,30 L 400,155 L 320,155 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="midrange-right" />
            <path d="M 180,155 L 320,155 L 320,235 L 180,235 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="midrange-center" />
            
            <path d="M 100,315 L 180,315 L 180,440 L 100,440 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="midrange-left" />
            <path d="M 320,315 L 400,315 L 400,440 L 320,440 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="midrange-right" />
            <path d="M 180,235 L 320,235 L 320,315 L 180,315 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="midrange-center" />
            
            <!-- 3-point areas -->
            <path d="M 30,30 L 100,30 L 100,155 L 30,155 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-left-corner" />
            <path d="M 400,30 L 470,30 L 470,155 L 400,155 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-right-corner" />
            <path d="M 30,155 L 100,155 L 100,235 L 30,235 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-left-wing" />
            <path d="M 400,155 L 470,155 L 470,235 L 400,235 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-right-wing" />
            
            <path d="M 30,235 L 180,235 L 180,315 L 30,315 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-top" />
            <path d="M 320,235 L 470,235 L 470,315 L 320,315 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-top" />
            
            <path d="M 30,315 L 100,315 L 100,440 L 30,440 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-left-corner" />
            <path d="M 400,315 L 470,315 L 470,440 L 400,440 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-right-corner" />
            
            <path d="M 100,315 L 180,315 L 180,440 L 100,440 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-left-wing" />
            <path d="M 400,315 L 470,315 L 470,440 L 400,440 Z" fill="rgba(0,0,0,0.05)" stroke="none" class="shot-zone" data-zone="3pt-right-wing" />
        </svg>
    `;
    
    shotChartContainer.appendChild(courtDiv);
    
    // If no shot data, show a message
    if (!shotData || (!shotData.home.total && !shotData.away.total)) {
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'no-data-message';
        noDataMsg.textContent = 'No shot data available';
        shotChartContainer.appendChild(noDataMsg);
        return;
    }
    
    // Add shot markers to the court
    const svg = courtDiv.querySelector('svg');
    
    // Prepare the data based on filters
    let dataToShow = [];
    
    if (team === 'home' || team === 'all') {
        // Add home team shots
        Object.keys(shotData.home.makes).forEach(location => {
            if (filter === 'all' || filter === 'makes') {
                dataToShow.push({
                    team: 'home',
                    location: location,
                    count: shotData.home.makes[location],
                    type: 'make'
                });
            }
        });
        
        Object.keys(shotData.home.misses).forEach(location => {
            if (filter === 'all' || filter === 'misses') {
                dataToShow.push({
                    team: 'home',
                    location: location,
                    count: shotData.home.misses[location],
                    type: 'miss'
                });
            }
        });
    }
    
    if (team === 'away' || team === 'all') {
        // Add away team shots
        Object.keys(shotData.away.makes).forEach(location => {
            if (filter === 'all' || filter === 'makes') {
                dataToShow.push({
                    team: 'away',
                    location: location,
                    count: shotData.away.makes[location],
                    type: 'make'
                });
            }
        });
        
        Object.keys(shotData.away.misses).forEach(location => {
            if (filter === 'all' || filter === 'misses') {
                dataToShow.push({
                    team: 'away',
                    location: location,
                    count: shotData.away.misses[location],
                    type: 'miss'
                });
            }
        });
    }
    
    // Add markers for each shot zone
    dataToShow.forEach(data => {
        if (data.count === 0) return;
        
        // Find the corresponding zone element
        const zoneElements = svg.querySelectorAll(`.shot-zone[data-zone="${data.location}"]`);
        
        zoneElements.forEach(zoneElement => {
            // Get the center of the zone
            const bbox = zoneElement.getBBox();
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            
            // Create marker
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            marker.classList.add('shot-marker');
            
            // Determine color based on team and shot type
            let markerColor;
            let markerStroke;
            
            if (data.team === 'home') {
                markerColor = data.type === 'make' ? getComputedStyle(document.documentElement).getPropertyValue('--home-color') : 'white';
                markerStroke = data.type === 'make' ? 'white' : getComputedStyle(document.documentElement).getPropertyValue('--home-color');
            } else {
                markerColor = data.type === 'make' ? getComputedStyle(document.documentElement).getPropertyValue('--away-color') : 'white';
                markerStroke = data.type === 'make' ? 'white' : getComputedStyle(document.documentElement).getPropertyValue('--away-color');
            }
            
            // Create the marker shape
            const markerShape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            markerShape.setAttribute('cx', centerX);
            markerShape.setAttribute('cy', centerY);
            markerShape.setAttribute('r', Math.min(25, 10 + data.count * 3)); // Size based on count
            markerShape.setAttribute('fill', markerColor);
            markerShape.setAttribute('stroke', markerStroke);
            markerShape.setAttribute('stroke-width', '2');
            markerShape.setAttribute('opacity', '0.7');
            
            // Create the text label
            const markerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            markerText.setAttribute('x', centerX);
            markerText.setAttribute('y', centerY);
            markerText.setAttribute('text-anchor', 'middle');
            markerText.setAttribute('dominant-baseline', 'middle');
            markerText.setAttribute('fill', data.type === 'make' ? 'white' : markerColor);
            markerText.setAttribute('font-size', '14');
            markerText.setAttribute('font-weight', 'bold');
            markerText.textContent = data.count;
            
            marker.appendChild(markerShape);
            marker.appendChild(markerText);
            svg.appendChild(marker);
        });
    });
    
    // Add legend
    const legend = document.createElement('div');
    legend.className = 'shot-chart-legend';
    legend.innerHTML = `
        <div class="legend-item">
            <span class="legend-color" style="background-color: var(--home-color);"></span>
            <span class="legend-label">Home Makes</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: white; border: 2px solid var(--home-color);"></span>
            <span class="legend-label">Home Misses</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: var(--away-color);"></span>
            <span class="legend-label">Away Makes</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: white; border: 2px solid var(--away-color);"></span>
            <span class="legend-label">Away Misses</span>
        </div>
    `;
    
    shotChartContainer.appendChild(legend);
}

/**
 * Update Dashboard Function
 * Enhanced to include possession stats and shot visualization
 */
function renderDashboard() {
    if (!GameTracker.currentGame) {
        // Try to get most recent game
        const games = DB.getGames();
        if (games.length > 0) {
            GameTracker.currentGame = games[games.length - 1];
        } else {
            const homeTeamStats = document.getElementById('home-team-stats');
            const awayTeamStats = document.getElementById('away-team-stats');
            
            if (homeTeamStats) homeTeamStats.innerHTML = '<p>No game data available</p>';
            if (awayTeamStats) awayTeamStats.innerHTML = '<p>No game data available</p>';
            return;
        }
    }
    
    const dashboardData = GameTracker.generateDashboardData();
    
    if (!dashboardData) {
        const homeTeamStats = document.getElementById('home-team-stats');
        const awayTeamStats = document.getElementById('away-team-stats');
        
        if (homeTeamStats) homeTeamStats.innerHTML = '<p>No dashboard data available</p>';
        if (awayTeamStats) awayTeamStats.innerHTML = '<p>No dashboard data available</p>';
        return;
    }
    
    // Render home team stats
    const homeTeamStats = document.getElementById('home-team-stats');
    if (homeTeamStats) {
        homeTeamStats.innerHTML = `
            <h4>${dashboardData.teams.home.name}</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.stats.totals.pts}</div>
                    <div class="stat-label">Points</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.stats.percentages.fg}%</div>
                    <div class="stat-label">FG%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.stats.percentages.tp}%</div>
                    <div class="stat-label">3P%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.stats.percentages.ft}%</div>
                    <div class="stat-label">FT%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.stats.percentages.efg}%</div>
                    <div class="stat-label">EFG%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.advanced.ortg}</div>
                    <div class="stat-label">ORTG</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.advanced.drtg}</div>
                    <div class="stat-label">DRTG</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.advanced.netrtg}</div>
                    <div class="stat-label">NET RTG</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.advanced.astRatio}%</div>
                    <div class="stat-label">AST%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.advanced.rebPct}%</div>
                    <div class="stat-label">REB%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.advanced.tovRatio}%</div>
                    <div class="stat-label">TOV%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.home.advanced.paintPct}%</div>
                    <div class="stat-label">PAINT%</div>
                </div>
            </div>
        `;
    }
    
    // Render away team stats
    const awayTeamStats = document.getElementById('away-team-stats');
    if (awayTeamStats) {
        awayTeamStats.innerHTML = `
            <h4>${dashboardData.teams.away.name}</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.stats.totals.pts}</div>
                    <div class="stat-label">Points</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.stats.percentages.fg}%</div>
                    <div class="stat-label">FG%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.stats.percentages.tp}%</div>
                    <div class="stat-label">3P%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.stats.percentages.ft}%</div>
                    <div class="stat-label">FT%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.stats.percentages.efg}%</div>
                    <div class="stat-label">EFG%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.advanced.ortg}</div>
                    <div class="stat-label">ORTG</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.advanced.drtg}</div>
                    <div class="stat-label">DRTG</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.advanced.netrtg}</div>
                    <div class="stat-label">NET RTG</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.advanced.astRatio}%</div>
                    <div class="stat-label">AST%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.advanced.rebPct}%</div>
                    <div class="stat-label">REB%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.advanced.tovRatio}%</div>
                    <div class="stat-label">TOV%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${dashboardData.teams.away.advanced.paintPct}%</div>
                    <div class="stat-label">PAINT%</div>
                </div>
            </div>
        `;
    }
    
    // Render advanced stats section
    const advancedStatsContainer = document.getElementById('advanced-stats-container');
    if (advancedStatsContainer) {
        advancedStatsContainer.innerHTML = `
            <div class="advanced-stats-grid">
                <div class="advanced-stat">
                    <h5>Possessions</h5>
                    <div class="stat-value">${dashboardData.possessions}</div>
                    <p class="stat-desc">Estimated number of possessions in the game</p>
                </div>
                <div class="advanced-stat">
                    <h5>Pace</h5>
                    <div class="stat-value">${(dashboardData.possessions / 2 * 40).toFixed(1)}</div>
                    <p class="stat-desc">Possessions per 40 minutes (2 halves)</p>
                </div>
                <div class="advanced-stat">
                    <h5>Team Comparison</h5>
                    <div class="comparison-bar">
                        <div class="home-bar" style="width: ${dashboardData.teams.home.stats.totals.pts / (dashboardData.teams.home.stats.totals.pts + dashboardData.teams.away.stats.totals.pts) * 100}%;">${dashboardData.teams.home.name}</div>
                        <div class="away-bar" style="width: ${dashboardData.teams.away.stats.totals.pts / (dashboardData.teams.home.stats.totals.pts + dashboardData.teams.away.stats.totals.pts) * 100}%;">${dashboardData.teams.away.name}</div>
                    </div>
                    <p class="stat-desc">Points scored ratio</p>
                </div>
            </div>
        `;
    }
    
    // Render possession stats
    const totalPossessions = dashboardData.actualPossessions || 0;
    let homePossessions = 0;
    let awayPossessions = 0;
    let totalDuration = 0;
    
    // Count actual possessions by team
    if (GameTracker.currentGame && GameTracker.currentGame.possessions) {
        GameTracker.currentGame.possessions.forEach(possession => {
            if (possession.team === 'home') homePossessions++;
            else if (possession.team === 'away') awayPossessions++;
            
            totalDuration += possession.duration || 0;
        });
    }
    
    // Calculate average possession duration in seconds
    const avgDuration = totalPossessions > 0 ? (totalDuration / totalPossessions / 1000).toFixed(1) : 0;
    
    // Update possession stats in the UI
    document.getElementById('total-possessions').textContent = totalPossessions;
    document.getElementById('home-possessions').textContent = homePossessions;
    document.getElementById('away-possessions').textContent = awayPossessions;
    document.getElementById('avg-possession-time').textContent = avgDuration;
    
    // Render shot chart
    renderShotChart(dashboardData.shotData, 'all', 'all');
    
    // Add event listeners for shot chart filters
    const teamToggleButtons = document.querySelectorAll('.team-toggle .toggle-btn');
    teamToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            teamToggleButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filterButtons = document.querySelectorAll('.shot-chart-filter .filter-btn');
            const activeFilter = Array.from(filterButtons).find(btn => btn.classList.contains('active'));
            renderShotChart(dashboardData.shotData, this.dataset.team, activeFilter ? activeFilter.dataset.filter : 'all');
        });
    });
    
    const filterButtons = document.querySelectorAll('.shot-chart-filter .filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const teamButtons = document.querySelectorAll('.team-toggle .toggle-btn');
            const activeTeam = Array.from(teamButtons).find(btn => btn.classList.contains('active'));
            renderShotChart(dashboardData.shotData, activeTeam ? activeTeam.dataset.team : 'all', this.dataset.filter);
        });
    });
}

/**
 * Update renderBoxScore function to remove minutes and plus-minus columns
 */
function renderBoxScore(teamType) {
    if (!GameTracker.currentGame) {
        // Try to get most recent game
        const games = DB.getGames();
        if (games.length > 0) {
            GameTracker.currentGame = games[games.length - 1];
        } else {
            const boxScoreBody = document.getElementById('box-score-body');
            if (boxScoreBody) {
                boxScoreBody.innerHTML = '<tr><td colspan="13">No game data available</td></tr>';
            }
            return;
        }
    }
    
    const boxScore = GameTracker.generateBoxScore(teamType);
    
    if (!boxScore) {
        const boxScoreBody = document.getElementById('box-score-body');
        if (boxScoreBody) {
            boxScoreBody.innerHTML = '<tr><td colspan="13">No box score available</td></tr>';
        }
        return;
    }
    
    const tbody = document.getElementById('box-score-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Add player rows
    boxScore.players.forEach(player => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="player-col">#${player.number} ${player.name}</td>
            <td>${player.points}</td>
            <td>${player.fgm}/${player.fga} (${player.fgPercent}%)</td>
            <td>${player.tpm}/${player.tpa} (${player.tpPercent}%)</td>
            <td>${player.ftm}/${player.fta} (${player.ftPercent}%)</td>
            <td>${player.oreb}</td>
            <td>${player.dreb}</td>
            <td>${player.rebounds}</td>
            <td>${player.ast}</td>
            <td>${player.stl}</td>
            <td>${player.blk}</td>
            <td>${player.to}</td>
            <td>${player.pf}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add team totals
    const totalsRow = document.createElement('tr');
    totalsRow.className = 'team-totals';
    
    // Calculate team shooting percentages
    const fgPercent = boxScore.totals.fga > 0 ? (boxScore.totals.fgm / boxScore.totals.fga * 100).toFixed(1) : '0.0';
    const tpPercent = boxScore.totals.tpa > 0 ? (boxScore.totals.tpm / boxScore.totals.tpa * 100).toFixed(1) : '0.0';
    const ftPercent = boxScore.totals.fta > 0 ? (boxScore.totals.ftm / boxScore.totals.fta * 100).toFixed(1) : '0.0';
    
    totalsRow.innerHTML = `
        <td class="player-col"><strong>TOTALS</strong></td>
        <td><strong>${boxScore.totals.pts}</strong></td>
        <td>${boxScore.totals.fgm}/${boxScore.totals.fga} (${fgPercent}%)</td>
        <td>${boxScore.totals.tpm}/${boxScore.totals.tpa} (${tpPercent}%)</td>
        <td>${boxScore.totals.ftm}/${boxScore.totals.fta} (${ftPercent}%)</td>
        <td>${boxScore.totals.oreb}</td>
        <td>${boxScore.totals.dreb}</td>
        <td>${boxScore.totals.reb}</td>
        <td>${boxScore.totals.ast}</td>
        <td>${boxScore.totals.stl}</td>
        <td>${boxScore.totals.blk}</td>
        <td>${boxScore.totals.to}</td>
        <td>${boxScore.totals.pf}</td>
    `;
    
    const boxScoreTotals = document.getElementById('box-score-totals');
    if (boxScoreTotals) {
        boxScoreTotals.innerHTML = '';
        boxScoreTotals.appendChild(totalsRow);
    }
}

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
});