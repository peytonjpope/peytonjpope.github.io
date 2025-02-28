/**
 * Main Application Logic
 * Handles the application initialization and screen navigation
 */

// Initialize the application when DOM content is loaded
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
});

/**
 * Check if there's a saved game in progress
 */
function checkForSavedGame() {
    const savedGame = DB.getCurrentGame();
    
    if (savedGame) {
        if (confirm('You have a game in progress. Would you like to resume?')) {
            GameTracker.resumeGame();
            navigateToScreen('game');
        } else {
            DB.clearCurrentGame();
        }
    }
}

/**
 * Set up navigation between screens
 */
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const screenId = this.dataset.screen;
            navigateToScreen(screenId);
        });
    });
    
    // Toggle menu on mobile
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }
}

/**
 * Navigate to a specific screen
 * @param {String} screenId - ID of screen to navigate to
 */
function navigateToScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the selected screen
    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.remove('active');
        if (button.dataset.screen === screenId) {
            button.classList.add('active');
        }
    });
    
    // Special logic for different screens
    if (screenId === 'boxscore') {
        renderBoxScore('home');
    } else if (screenId === 'dashboard') {
        renderDashboard();
    } else if (screenId === 'teams') {
        renderTeamsList();
    }
    
    // Load screen-specific CSS
    loadScreenCSS(screenId);
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
    // Game Setup Screen
    const addHomePlayerBtn = document.getElementById('add-home-player');
    if (addHomePlayerBtn) {
        addHomePlayerBtn.addEventListener('click', function() {
            addPlayerRow('home-players');
        });
    }
    
    const addAwayPlayerBtn = document.getElementById('add-away-player');
    if (addAwayPlayerBtn) {
        addAwayPlayerBtn.addEventListener('click', function() {
            addPlayerRow('away-players');
        });
    }
    
    const saveTeamsBtn = document.getElementById('save-teams');
    if (saveTeamsBtn) {
        saveTeamsBtn.addEventListener('click', saveTeamsData);
    }
    
    const startGameBtn = document.getElementById('start-game');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startNewGame);
    }
    
    // Team selection dropdowns
    const homeTeamSelect = document.getElementById('home-team-select');
    if (homeTeamSelect) {
        homeTeamSelect.addEventListener('change', function() {
            loadTeamPlayers('home', this.value);
        });
    }
    
    const awayTeamSelect = document.getElementById('away-team-select');
    if (awayTeamSelect) {
        awayTeamSelect.addEventListener('change', function() {
            loadTeamPlayers('away', this.value);
        });
    }
    
    // Game Screen - Home Team Stat Buttons
    document.querySelectorAll('.home-stat-btn').forEach(button => {
        button.addEventListener('click', function() {
            const statType = this.dataset.stat;
            GameTracker.recordHomeStat(statType);
        });
    });
    
    // Game Screen - Away Team Stat Buttons
    document.querySelectorAll('.away-stat-btn').forEach(button => {
        button.addEventListener('click', function() {
            const statType = this.dataset.stat;
            GameTracker.recordAwayStat(statType);
        });
    });
    
    const endPeriodBtn = document.getElementById('end-period');
    if (endPeriodBtn) {
        endPeriodBtn.addEventListener('click', function() {
            GameTracker.endPeriod();
        });
    }
    
    const endGameBtn = document.getElementById('end-game');
    if (endGameBtn) {
        endGameBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to end the game? This will save all statistics.')) {
                const gameId = GameTracker.endGame();
                if (gameId) {
                    alert('Game saved successfully!');
                    navigateToScreen('boxscore');
                }
            }
        });
    }
    
    // Box Score Screen
    document.querySelectorAll('.team-toggle .toggle-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.team-toggle .toggle-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            renderBoxScore(this.dataset.team);
        });
    });
    
    // Teams Management Screen
    const exportDataBtn = document.getElementById('export-data');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function() {
            const fileData = ExportImport.exportAllData();
            ExportImport.downloadFile(fileData);
        });
    }
    
    const importDataBtn = document.getElementById('import-data');
    const importFile = document.getElementById('import-file');
    
    if (importDataBtn && importFile) {
        importDataBtn.addEventListener('click', function() {
            importFile.click();
        });
        
        importFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const content = event.target.result;
                const success = ExportImport.importData(content);
                
                if (success) {
                    alert('Data imported successfully!');
                    loadTeamsData();
                    renderTeamsList();
                } else {
                    alert('Failed to import data. Please check the file format.');
                }
            };
            reader.readAsText(file);
        });
    }
}

/**
 * Add a new player row to a team's player list
 * @param {String} containerId - ID of player list container
 */
function addPlayerRow(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const playerEntry = document.createElement('div');
    playerEntry.className = 'player-entry';
    
    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.className = 'player-number';
    numberInput.placeholder = '#';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'player-name';
    nameInput.placeholder = 'Player Name';
    
    playerEntry.appendChild(numberInput);
    playerEntry.appendChild(nameInput);
    
    container.appendChild(playerEntry);
}

/**
 * Save teams data from setup screen
 */
function saveTeamsData() {
    const homeTeamInput = document.getElementById('home-team');
    const awayTeamInput = document.getElementById('away-team');
    
    if (!homeTeamInput || !awayTeamInput) return;
    
    const homeTeam = {
        name: homeTeamInput.value,
        abbr: homeTeamInput.value.substring(0, 3).toUpperCase(),
        players: getPlayersFromContainer('home-players')
    };
    
    const awayTeam = {
        name: awayTeamInput.value,
        abbr: awayTeamInput.value.substring(0, 3).toUpperCase(),
        players: getPlayersFromContainer('away-players')
    };
    
    if (!homeTeam.name || !awayTeam.name) {
        alert('Please enter team names');
        return;
    }
    
    if (homeTeam.players.length === 0 || awayTeam.players.length === 0) {
        alert('Please add players to both teams');
        return;
    }
    
    // Save teams to database
    DB.saveTeam(homeTeam);
    DB.saveTeam(awayTeam);
    
    // Reload teams data
    loadTeamsData();
    
    alert('Teams saved successfully!');
}

/**
 * Get players data from a container
 * @param {String} containerId - ID of player list container
 * @returns {Array} Array of player objects
 */
function getPlayersFromContainer(containerId) {
    const playerEntries = document.querySelectorAll(`#${containerId} .player-entry`);
    const players = [];
    
    playerEntries.forEach(entry => {
        const numberInput = entry.querySelector('.player-number');
        const nameInput = entry.querySelector('.player-name');
        
        if (!numberInput || !nameInput) return;
        
        const number = numberInput.value.trim();
        const name = nameInput.value.trim();
        
        if (number && name) {
            players.push({
                number: number,
                name: name,
                id: 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
            });
        }
    });
    
    return players;
}

/**
 * Start a new game with the current setup data
 */
function startNewGame() {
    const homeTeamInput = document.getElementById('home-team');
    const awayTeamInput = document.getElementById('away-team');
    const gameDateInput = document.getElementById('game-date');
    const locationInput = document.getElementById('game-location');
    
    if (!homeTeamInput || !awayTeamInput) return;
    
    const homeTeam = {
        name: homeTeamInput.value,
        abbr: homeTeamInput.value.substring(0, 3).toUpperCase(),
        players: getPlayersFromContainer('home-players')
    };
    
    const awayTeam = {
        name: awayTeamInput.value,
        abbr: awayTeamInput.value.substring(0, 3).toUpperCase(),
        players: getPlayersFromContainer('away-players')
    };
    
    const gameDate = gameDateInput ? gameDateInput.value : '';
    const location = locationInput ? locationInput.value : '';
    
    if (!homeTeam.name || !awayTeam.name) {
        alert('Please enter team names');
        return;
    }
    
    if (homeTeam.players.length === 0 || awayTeam.players.length === 0) {
        alert('Please add players to both teams');
        return;
    }
    
    // Initialize game
    GameTracker.initGame({
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        date: gameDate,
        location: location
    });
    
    // Navigate to game screen
    navigateToScreen('game');
}

/**
 * Load saved teams data
 */
function loadTeamsData() {
    const teams = DB.getTeams();
    
    const homeSelect = document.getElementById('home-team-select');
    const awaySelect = document.getElementById('away-team-select');
    
    if (!homeSelect || !awaySelect) return;
    
    // Clear current options
    homeSelect.innerHTML = '<option value="">-- Select Saved Team --</option>';
    awaySelect.innerHTML = '<option value="">-- Select Saved Team --</option>';
    
    // Add team options
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.name;
        option.textContent = team.name;
        
        homeSelect.appendChild(option.cloneNode(true));
        awaySelect.appendChild(option);
    });
}

/**
 * Load a team's players
 * @param {String} teamType - 'home' or 'away'
 * @param {String} teamName - Name of team to load
 */
function loadTeamPlayers(teamType, teamName) {
    if (!teamName) return;
    
    const team = DB.getTeam(teamName);
    if (!team) return;
    
    // Set team name
    const teamNameInput = document.getElementById(`${teamType}-team`);
    if (teamNameInput) {
        teamNameInput.value = team.name;
    }
    
    // Clear existing players
    const container = document.getElementById(`${teamType}-players`);
    if (!container) return;
    
    container.innerHTML = '';
    
    // Add players
    team.players.forEach(player => {
        const playerEntry = document.createElement('div');
        playerEntry.className = 'player-entry';
        
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.className = 'player-number';
        numberInput.value = player.number;
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'player-name';
        nameInput.value = player.name;
        
        playerEntry.appendChild(numberInput);
        playerEntry.appendChild(nameInput);
        
        container.appendChild(playerEntry);
    });
}

/**
 * Render the box score for a specific team
 * @param {String} teamType - 'home' or 'away'
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
                boxScoreBody.innerHTML = '<tr><td colspan="15">No game data available</td></tr>';
            }
            return;
        }
    }
    
    const boxScore = GameTracker.generateBoxScore(teamType);
    
    if (!boxScore) {
        const boxScoreBody = document.getElementById('box-score-body');
        if (boxScoreBody) {
            boxScoreBody.innerHTML = '<tr><td colspan="15">No box score available</td></tr>';
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
            <td>${player.minutes || '-'}</td>
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
            <td>${player.plusMinus}</td>
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
        <td>-</td>
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
        <td>-</td>
    `;
    
    const boxScoreTotals = document.getElementById('box-score-totals');
    if (boxScoreTotals) {
        boxScoreTotals.innerHTML = '';
        boxScoreTotals.appendChild(totalsRow);
    }
}

/**
 * Render the dashboard with advanced statistics
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
}

/**
 * Render the teams management list
 */
function renderTeamsList() {
    const teams = DB.getTeams();
    
    const teamsListContainer = document.getElementById('saved-teams-list');
    if (!teamsListContainer) return;
    
    if (teams.length === 0) {
        teamsListContainer.innerHTML = '<p>No saved teams. Create teams on the Setup screen.</p>';
        return;
    }
    
    teamsListContainer.innerHTML = '';
    
    teams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        
        const playersList = team.players.map(player => `#${player.number} ${player.name}`).join(', ');
        
        teamCard.innerHTML = `
            <h3>${team.name}</h3>
            <p><strong>Players:</strong> ${playersList}</p>
            <div class="team-card-actions">
                <button class="btn-secondary delete-team" data-team="${team.name}">Delete</button>
                <button class="btn-secondary export-team" data-team="${team.name}">Export</button>
            </div>
        `;
        
        teamsListContainer.appendChild(teamCard);
    });
    
    // Add event listeners for team actions
    document.querySelectorAll('.delete-team').forEach(button => {
        button.addEventListener('click', function() {
            const teamName = this.dataset.team;
            
            if (confirm(`Are you sure you want to delete the team "${teamName}"?`)) {
                DB.deleteTeam(teamName);
                renderTeamsList();
                loadTeamsData();
            }
        });
    });
    
    document.querySelectorAll('.export-team').forEach(button => {
        button.addEventListener('click', function() {
            const teamName = this.dataset.team;
            const team = DB.getTeam(teamName);
            
            if (team) {
                const jsonContent = JSON.stringify(team, null, 2);
                const filename = `${team.name}_team.json`;
                
                ExportImport.downloadFile({
                    content: jsonContent,
                    filename: filename
                });
            }
        });
    });
}

/**
 * Export a game to CSV
 * @param {String} gameId - ID of game to export
 */
function exportGameToCSV(gameId) {
    const fileData = ExportImport.exportGameToCSV(gameId);
    
    if (fileData) {
        ExportImport.downloadFile(fileData);
    } else {
        alert('Error exporting game data.');
    }
}

/**
 * Add CSS style based on current screen
 * @param {String} screenId - ID of current screen
 */
function loadScreenCSS(screenId) {
    // Remove any existing screen-specific stylesheets
    const existingLink = document.getElementById('screen-css');
    if (existingLink) {
        existingLink.remove();
    }
    
    // Don't add specific CSS for setup and teams screens
    if (screenId === 'setup' || screenId === 'teams') {
        return;
    }
    
    // Add the new stylesheet
    const link = document.createElement('link');
    link.id = 'screen-css';
    link.rel = 'stylesheet';
    link.href = `css/${screenId}.css`;
    
    document.head.appendChild(link);
}