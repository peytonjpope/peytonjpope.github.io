/**
 * Game Tracking Functionality
 * Handles the active game tracking and statistics
 * Enhanced with possession tracking, shot quality & mapping, and player selection indicator
 */

const GameTracker = {
    // Current game state
    currentGame: null,
    homeSelectedPlayer: null,
    awaySelectedPlayer: null,
    period: 1,
    actionLog: [],
    
    // Possession tracking
    currentPossession: {
        team: null,
        actions: [],
        startTime: null
    },
    
    /**
     * Initialize a new game
     * @param {Object} gameData - Initial game setup data
     */
    initGame: function(gameData) {
        this.currentGame = {
            id: 'game_' + Date.now(),
            date: gameData.date || new Date().toISOString().split('T')[0],
            location: gameData.location || '',
            notes: gameData.notes || '',
            period: this.period,
            homeTeam: {
                name: gameData.homeTeam.name,
                abbr: gameData.homeTeam.abbr || gameData.homeTeam.name.substring(0, 3).toUpperCase(),
                score: 0,
                players: this.initPlayers(gameData.homeTeam.players)
            },
            awayTeam: {
                name: gameData.awayTeam.name,
                abbr: gameData.awayTeam.abbr || gameData.awayTeam.name.substring(0, 3).toUpperCase(),
                score: 0,
                players: this.initPlayers(gameData.awayTeam.players)
            },
            possessions: [],
            shotData: []
        };
        
        this.actionLog = [];
        this.homeSelectedPlayer = null;
        this.awaySelectedPlayer = null;
        this.period = 1;
        this.currentPossession = {
            team: null,
            actions: [],
            startTime: null
        };
        
        // Save initial game state
        DB.saveCurrentGame(this.currentGame);
        
        // Update UI
        this.updateGameUI();
    },
    
    /**
     * Initialize player stats objects - without minutes and plusMinus
     * @param {Array} players - Array of player data objects
     * @returns {Array} Players with initialized stats
     */
    initPlayers: function(players) {
        return players.map(player => {
            return {
                id: player.id || 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: player.name,
                number: player.number,
                // Initialize all stat properties to 0
                fgm: 0, fga: 0,
                tpm: 0, tpa: 0,
                ftm: 0, fta: 0,
                oreb: 0, dreb: 0,
                ast: 0, stl: 0, blk: 0,
                to: 0, pf: 0,
                paintTouch: 0
                // Removed: minutes, plusMinus
            };
        });
    },
    
    /**
     * Resume an in-progress game
     * @returns {Boolean} Success status
     */
    resumeGame: function() {
        const savedGame = DB.getCurrentGame();
        
        if (!savedGame) {
            return false;
        }
        
        this.currentGame = savedGame;
        this.period = savedGame.period || 1;
        this.actionLog = savedGame.actionLog || [];
        this.homeSelectedPlayer = null;
        this.awaySelectedPlayer = null;
        this.currentPossession = {
            team: null,
            actions: [],
            startTime: null
        };
        
        // Update UI
        this.updateGameUI();
        return true;
    },
    
    /**
     * Select a player for the home team
     * @param {String} playerId - ID of player to select
     */
    selectHomePlayer: function(playerId) {
        if (!this.currentGame) return;
        
        this.homeSelectedPlayer = this.currentGame.homeTeam.players.find(player => player.id === playerId);
        
        // Update UI to show selected player
        this.updateHomePlayerSelection();
    },
    
    /**
     * Select a player for the away team
     * @param {String} playerId - ID of player to select
     */
    selectAwayPlayer: function(playerId) {
        if (!this.currentGame) return;
        
        this.awaySelectedPlayer = this.currentGame.awayTeam.players.find(player => player.id === playerId);
        
        // Update UI to show selected player
        this.updateAwayPlayerSelection();
    },
    
    /**
     * Record a stat for the selected player, regardless of team
     * @param {String} statType - Type of stat to record
     * @returns {Boolean} Success status
     */
    recordStat: function(statType) {
        // Check if we have a home player selected
        if (this.homeSelectedPlayer) {
            const player = this.currentGame.homeTeam.players.find(p => p.id === this.homeSelectedPlayer.id);
            if (player) {
                return this.processStatAction(statType, player, 'home', this.currentGame.homeTeam);
            }
        }
        
        // Check if we have an away player selected
        if (this.awaySelectedPlayer) {
            const player = this.currentGame.awayTeam.players.find(p => p.id === this.awaySelectedPlayer.id);
            if (player) {
                return this.processStatAction(statType, player, 'away', this.currentGame.awayTeam);
            }
        }
        
        // No player selected
        return false;
    },
    
    /**
     * Process a stat action for a player with possession tracking
     * @param {String} statType - Type of stat to record
     * @param {Object} player - Player object
     * @param {String} teamType - 'home' or 'away'
     * @param {Object} team - Team object
     * @returns {Boolean} Success status
     */
    processStatAction: function(statType, player, teamType, team) {
        let scoreChange = 0;
        let endPossession = false;
        
        let logEntry = {
            timestamp: Date.now(),
            period: this.period,
            team: teamType,
            player: player.name,
            playerNumber: player.number,
            statType: statType
        };
        
        // Process stat based on type
        switch (statType) {
            case 'fga':
                player.fga++;
                logEntry.description = `#${player.number} ${player.name} field goal attempt`;
                // Prompt for shot quality and location
                this.promptShotDetails('fga', player, teamType);
                break;
                
            case 'fgm':
                player.fgm++;
                player.fga++;
                scoreChange = 2;
                team.score += 2;
                logEntry.description = `#${player.number} ${player.name} made 2pt field goal`;
                endPossession = true;
                // Prompt for shot quality and location
                this.promptShotDetails('fgm', player, teamType);
                break;
                
            case '3pa':
                player.tpa++;
                player.fga++;
                logEntry.description = `#${player.number} ${player.name} 3pt attempt`;
                // Prompt for shot quality and location
                this.promptShotDetails('3pa', player, teamType);
                break;
                
            case '3pm':
                player.tpm++;
                player.tpa++;
                player.fgm++;
                player.fga++;
                scoreChange = 3;
                team.score += 3;
                logEntry.description = `#${player.number} ${player.name} made 3pt field goal`;
                endPossession = true;
                // Prompt for shot quality and location
                this.promptShotDetails('3pm', player, teamType);
                break;
                
            case 'fta':
                player.fta++;
                logEntry.description = `#${player.number} ${player.name} free throw attempt`;
                break;
                
            case 'ftm':
                player.ftm++;
                player.fta++;
                scoreChange = 1;
                team.score += 1;
                logEntry.description = `#${player.number} ${player.name} made free throw`;
                endPossession = true;
                break;
                
            case 'oreb':
                player.oreb++;
                logEntry.description = `#${player.number} ${player.name} offensive rebound`;
                // Offensive rebounds continue the same possession
                break;
                
            case 'dreb':
                player.dreb++;
                logEntry.description = `#${player.number} ${player.name} defensive rebound`;
                endPossession = true;
                break;
                
            case 'ast':
                player.ast++;
                logEntry.description = `#${player.number} ${player.name} assist`;
                break;
                
            case 'stl':
                player.stl++;
                logEntry.description = `#${player.number} ${player.name} steal`;
                endPossession = true;
                break;
                
            case 'blk':
                player.blk++;
                logEntry.description = `#${player.number} ${player.name} block`;
                break;
                
            case 'tov':
                player.to++;
                logEntry.description = `#${player.number} ${player.name} turnover`;
                endPossession = true;
                break;
                
            case 'pf':
                player.pf++;
                logEntry.description = `#${player.number} ${player.name} foul`;
                break;
                
            case 'paint':
                player.paintTouch++;
                logEntry.description = `#${player.number} ${player.name} paint touch`;
                break;
                
            case 'endPossession':
                logEntry.description = `End of possession`;
                endPossession = true;
                break;
                
            case 'undo':
                return this.undoLastAction(teamType);
                
            default:
                return false;
        }
        
        // Add to current possession
        if (this.currentPossession.team === null) {
            // Start a new possession if none exists
            this.currentPossession = {
                team: teamType,
                actions: [logEntry],
                startTime: Date.now()
            };
        } else if (this.currentPossession.team === teamType) {
            // Add to current possession if same team
            this.currentPossession.actions.push(logEntry);
        } else {
            // End possession and start a new one if different team
            this.endCurrentPossession();
            this.currentPossession = {
                team: teamType,
                actions: [logEntry],
                startTime: Date.now()
            };
        }
        
        // End possession if needed
        if (endPossession) {
            this.endCurrentPossession();
        }
        
        // Add to action log
        this.actionLog.push(logEntry);
        
        // Save current game state
        this.saveGameState();
        
        // Update UI
        this.updateGameUI();
        this.updateActionLog(logEntry);
        
        return true;
    },
    
    /**
     * End the current possession and add it to the game data
     */
    endCurrentPossession: function() {
        if (this.currentPossession.team === null) return;
        
        // Create a possession summary entry
        const possessionLog = {
            timestamp: Date.now(),
            period: this.period,
            team: this.currentPossession.team,
            possessionId: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            actions: this.currentPossession.actions,
            duration: Date.now() - this.currentPossession.startTime
        };
        
        // Add to game possessions
        if (!this.currentGame.possessions) {
            this.currentGame.possessions = [];
        }
        this.currentGame.possessions.push(possessionLog);
        
        // Add a visual separator in the log
        this.updateActionLog({
            description: '— End of Possession —',
            separator: true
        });
        
        // Reset current possession
        this.currentPossession = {
            team: null,
            actions: [],
            startTime: null
        };
    },
    
    /**
 * Prompt for shot details (quality and location) and assist selection
 * @param {String} shotType - Type of shot (fga, fgm, 3pa, 3pm)
 * @param {Object} player - Player who took the shot
 * @param {String} teamType - 'home' or 'away'
 */
promptShotDetails: function(shotType, player, teamType) {
    const isMake = shotType === 'fgm' || shotType === '3pm';
    const is3pt = shotType === '3pa' || shotType === '3pm';
    
    // Create the modal with different court areas based on shot type
    const modal = document.createElement('div');
    modal.className = 'shot-modal';
    
    // Different HTML content for 2-point vs 3-point shots
    let courtAreasHTML = '';
    
    if (is3pt) {
        courtAreasHTML = `
            <div class="court-area" data-location="3pt-left-corner">Left Corner</div>
            <div class="blank-court-area"></div>
            <div class="court-area" data-location="3pt-right-corner">Right Corner</div>
            <div class="court-area" data-location="3pt-left-wing">Left Wing</div>
            <div class="court-area" data-location="3pt-top">Top Key</div>
            <div class="court-area" data-location="3pt-right-wing">Right Wing</div>
        `;
    } else {
        courtAreasHTML = `
            <div class="court-area" data-location="midrange-left-corner">Left Corner</div>
            <div class="court-area" data-location="rim">Rim</div>
            <div class="court-area" data-location="midrange-right-corner">Right Corner</div>
            <div class="court-area" data-location="midrange-left">Left Wing</div>
            <div class="court-area" data-location="paint-far">Paint Far</div>
            <div class="court-area" data-location="midrange-right">Right Wing</div>
            <div class="court-area" data-location="midrange-top">Top Key</div>
        `;
    }
    
    // Create the full modal content
    modal.innerHTML = `
        <div class="shot-modal-content">
            <h3>${isMake ? 'Made' : 'Missed'} ${is3pt ? '3PT' : '2PT'} Shot Details</h3>
            <p>#${player.number} ${player.name} - ${teamType === 'home' ? this.currentGame.homeTeam.name : this.currentGame.awayTeam.name}</p>
            
            <div class="shot-quality-section">
                <h4>Shot Quality (1-10)</h4>
                <div class="shot-quality-buttons">
                    ${Array.from({length: 10}, (_, i) => `<button class="quality-btn" data-quality="${i+1}">${i+1}</button>`).join('')}
                </div>
            </div>
            
            <div class="shot-location-section">
                <h4>Shot Location</h4>
                <div class="court-diagram">
                    <div class="court-container">
                        ${courtAreasHTML}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the DOM
    document.body.appendChild(modal);
    
    // Variables to track selection
    let selectedQuality = null;
    let selectedLocation = null;
    
    // First step: Save shot details and then prompt for assist if it's a make
    const saveShot = () => {
        if (selectedQuality && selectedLocation) {
            const shotDetails = {
                quality: selectedQuality,
                location: selectedLocation,
                timestamp: Date.now(),
                player: player.id,
                team: teamType,
                shotType: shotType,
                isMake: isMake,
                is3pt: is3pt,
                assistedBy: null // Will be populated if an assist is selected
            };
            
            if (!GameTracker.currentGame.shotData) {
                GameTracker.currentGame.shotData = [];
            }
            
            // If it's a made shot, show the assist prompt
            if (isMake) {
                document.body.removeChild(modal);
                this.promptShotAssist(shotDetails, teamType);
            } else {
                // If it's a miss, just save the shot without assist prompt
                GameTracker.currentGame.shotData.push(shotDetails);
                GameTracker.saveGameState();
                document.body.removeChild(modal);
            }
        }
    };
    
    // Click outside to cancel
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Add event listeners for quality buttons
    const qualityButtons = modal.querySelectorAll('.quality-btn');
    qualityButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            qualityButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedQuality = parseInt(this.dataset.quality, 10);
            
            // Auto-save if both selections are made
            if (selectedQuality && selectedLocation) {
                saveShot();
            }
        });
    });
    
    // Add event listeners for location areas
    const locationAreas = modal.querySelectorAll('.court-area');
    locationAreas.forEach(area => {
        area.addEventListener('click', function() {
            locationAreas.forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            selectedLocation = this.dataset.location;
            
            // Auto-save if both selections are made
            if (selectedQuality && selectedLocation) {
                saveShot();
            }
        });
    });
},

/**
 * Prompt for shot assist selection
 * @param {Object} shotDetails - Details of the shot already collected
 * @param {String} teamType - 'home' or 'away'
 */
promptShotAssist: function(shotDetails, teamType) {
    // Create the assist selection modal
    const assistModal = document.createElement('div');
    assistModal.className = 'shot-modal assist-modal';
    
    // Get players from the same team
    const teamPlayers = teamType === 'home' 
        ? this.currentGame.homeTeam.players 
        : this.currentGame.awayTeam.players;
    
    // Find the shooter's info to exclude them from assist options
    const shooter = teamPlayers.find(p => p.id === shotDetails.player);
    
    // Create the buttons for each teammate (excluding the shooter)
    const playerButtons = teamPlayers
        .filter(p => p.id !== shotDetails.player)
        .map(p => `
            <button class="player-assist-btn" data-player-id="${p.id}">
                ${p.number} 
            </button>
        `)
        .join('');
    
    // Create modal content
    assistModal.innerHTML = `
        <div class="shot-modal-content">
            <h3>#${shooter.number} Made Shot</h3>
            <p>Assisted by:</p>
            <div class="assist-selection">
                <div class="player-assist-buttons">
                    ${playerButtons}
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the DOM
    document.body.appendChild(assistModal);
    
    // Handle assist selection
    const handleAssistSelection = (assistPlayerId) => {
        // Update shot details with the assist info
        if (assistPlayerId !== 'none') {
            shotDetails.assistedBy = assistPlayerId;
            
            // If a player assisted, also record it as an assist in their stats
            const assistPlayer = teamPlayers.find(p => p.id === assistPlayerId);
            if (assistPlayer) {
                assistPlayer.ast++;
                
                // Log the assist
                this.actionLog.push({
                    timestamp: Date.now(),
                    period: this.period,
                    team: teamType,
                    player: assistPlayer.name,
                    playerNumber: assistPlayer.number,
                    statType: 'ast',
                    description: `#${assistPlayer.number} ${assistPlayer.name} assist to #${shooter.number} ${shooter.name}`
                });
            }
        }
        
        // Save the shot data
        GameTracker.currentGame.shotData.push(shotDetails);
        GameTracker.saveGameState();
        
        // Remove the modal
        document.body.removeChild(assistModal);
    };
    
    // Click outside to select "No Assist"
    assistModal.addEventListener('click', function(e) {
        if (e.target === assistModal) {
            handleAssistSelection('none');
        }
    });
    
    // Add event listeners for player assist buttons
    const assistButtons = assistModal.querySelectorAll('.player-assist-btn');
    assistButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const playerId = this.dataset.playerId;
            handleAssistSelection(playerId);
        });
    });
},
    
    /**
     * End the current period
     */
    endPeriod: function() {
        if (!this.currentGame) return;
        
        // End current possession if active
        if (this.currentPossession.team !== null) {
            this.endCurrentPossession();
        }
        
        this.period++;
        this.currentGame.period = this.period;
        
        // Log period change
        this.actionLog.push({
            timestamp: Date.now(),
            period: this.period - 1,
            description: `End of period ${this.period - 1}`
        });
        
        // Save current game state
        this.saveGameState();
        
        // Update UI
        if (this.period == 2) {
            document.getElementById('game-period').textContent = `2nd Half`;
            this.updateActionLog({
                description: `Start of 2nd period`
            });
        } else if (this.period > 2) {
            // End game if we've completed two halves
            this.endGame();
            alert('Game completed after 2 halves!');
            navigateToScreen('boxscore');
        }
    },
    
    /**
     * End the current game
     * @returns {String} Game ID
     */
    endGame: function() {
        if (!this.currentGame) return null;
        
        // End current possession if active
        if (this.currentPossession.team !== null) {
            this.endCurrentPossession();
        }
        
        // Calculate final stats and save to completed games
        const finalGame = {
            ...this.currentGame,
            endTime: new Date().toISOString(),
            actionLog: this.actionLog,
            completed: true
        };
        
        // Save to completed games
        const gameId = DB.saveGame(finalGame);
        
        // Clear current game
        DB.clearCurrentGame();
        this.currentGame = null;
        
        return gameId;
    },
    /**
     * Save current game state
     */
    saveGameState: function() {
        if (!this.currentGame) return;
        
        // Update current game with latest action log
        this.currentGame.actionLog = this.actionLog;
        DB.saveCurrentGame(this.currentGame);
    },
    
    /**
     * Update the game UI to reflect current state
     */
    updateGameUI: function() {
        if (!this.currentGame) return;
        
        // Update score display
        document.getElementById('home-score').textContent = this.currentGame.homeTeam.score;
        document.getElementById('away-score').textContent = this.currentGame.awayTeam.score;
        
        // Update team names
        document.getElementById('game-home-team').textContent = this.currentGame.homeTeam.name;
        document.getElementById('game-away-team').textContent = this.currentGame.awayTeam.name;
        
        // Update period display
        if (this.period == 1)
            document.getElementById('game-period').textContent = `1st Half`;
        if (this.period > 1)
            document.getElementById('game-period').textContent = `2nd Half`;
        
        // Update player selections
        this.renderHomePlayerSelection();
        this.renderAwayPlayerSelection();
        this.updateHomePlayerSelection();
        this.updateAwayPlayerSelection();
        // Make sure player selected indicator shows correct text
        // Make sure player selected indicator shows correct text
        if (!this.homeSelectedPlayer && !this.awaySelectedPlayer) {
            const playerSelectedIndicator = document.getElementById('player-selected-indicator');
            if (playerSelectedIndicator) {
                playerSelectedIndicator.textContent = 'No player selected';
                playerSelectedIndicator.style.backgroundColor = '#ececec'; // Neutral color
                playerSelectedIndicator.style.color = 'black';
            }
        }
        
    },
    
    /**
     * Render the home team player selection buttons
     */
    renderHomePlayerSelection: function() {
        if (!this.currentGame) return;
        
        const playerContainer = document.getElementById('home-active-players');
        if (!playerContainer) return;
        
        playerContainer.innerHTML = '';
        
        this.currentGame.homeTeam.players.forEach(player => {
            const playerBtn = document.createElement('button');
            playerBtn.className = 'player-btn';
            playerBtn.dataset.playerId = player.id;
            playerBtn.textContent = `${player.number}`;
            
            if (this.homeSelectedPlayer && this.homeSelectedPlayer.id === player.id) {
                playerBtn.classList.add('active');
            }
            
            playerBtn.addEventListener('click', () => {
                this.selectHomePlayer(player.id);
            });
            
            playerContainer.appendChild(playerBtn);
        });
    },
    
    /**
     * Render the away team player selection buttons
     */
    renderAwayPlayerSelection: function() {
        if (!this.currentGame) return;
        
        const playerContainer = document.getElementById('away-active-players');
        if (!playerContainer) return;
        
        playerContainer.innerHTML = '';
        
        this.currentGame.awayTeam.players.forEach(player => {
            const playerBtn = document.createElement('button');
            playerBtn.className = 'player-btn';
            playerBtn.dataset.playerId = player.id;
            playerBtn.textContent = `${player.number}`;
            
            if (this.awaySelectedPlayer && this.awaySelectedPlayer.id === player.id) {
                playerBtn.classList.add('active');
            }
            
            playerBtn.addEventListener('click', () => {
                this.selectAwayPlayer(player.id);
            });
            
            playerContainer.appendChild(playerBtn);
        });
    },
    
    /**
     * Update home team selected player display and border style
     * Now includes player selected indicator
     */
    updateHomePlayerSelection: function() {
        // Clear any existing active player in home team
        const homePlayerBtns = document.querySelectorAll('#home-active-players .player-btn');
        homePlayerBtns.forEach(btn => btn.classList.remove('active'));
        
        // Clear any existing active player in away team
        const awayPlayerBtns = document.querySelectorAll('#away-active-players .player-btn');
        awayPlayerBtns.forEach(btn => btn.classList.remove('active'));
        
        // Clear away team selection when home team player is selected
        this.awaySelectedPlayer = null;
        
        // Set the border color of the stat buttons container based on team
        const statButtonsContainer = document.getElementById('stat-buttons-container');
        if (statButtonsContainer) {
            statButtonsContainer.classList.remove('away-active');
            
            if (this.homeSelectedPlayer) {
                statButtonsContainer.classList.add('home-active');
                
                // Activate the player button
                const playerBtn = document.querySelector(`#home-active-players .player-btn[data-player-id="${this.homeSelectedPlayer.id}"]`);
                if (playerBtn) {
                    playerBtn.classList.add('active');
                }
                
                // Update player selected indicator
                const playerSelectedIndicator = document.getElementById('player-selected-indicator');
                if (playerSelectedIndicator) {
                    playerSelectedIndicator.textContent = `#${this.homeSelectedPlayer.number} ${this.homeSelectedPlayer.name}`;
                    playerSelectedIndicator.classList.add('visible');
                    playerSelectedIndicator.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--home-color');
                    playerSelectedIndicator.style.color = 'white';
                }
                
                // Update hidden span for JS references
                const selectedPlayerDisplay = document.getElementById('home-selected-player');
                if (selectedPlayerDisplay) {
                    selectedPlayerDisplay.textContent = `#${this.homeSelectedPlayer.number} ${this.homeSelectedPlayer.name}`;
                }
            } else {
                statButtonsContainer.classList.remove('home-active');
                
                // Update player selected indicator
                const playerSelectedIndicator = document.getElementById('player-selected-indicator');
                if (playerSelectedIndicator) {
                    playerSelectedIndicator.textContent = 'No player selected';
                    playerSelectedIndicator.style.backgroundColor = '#ececec'; // Neutral color
                    playerSelectedIndicator.style.color = 'black';
                }
                
                // Update hidden span for JS references
                const selectedPlayerDisplay = document.getElementById('home-selected-player');
                if (selectedPlayerDisplay) {
                    selectedPlayerDisplay.textContent = 'None';
                }
            }
        }
    },
    
    /**
     * Update away team selected player display and border style
     * Now includes player selected indicator
     */
    updateAwayPlayerSelection: function() {
        // Clear any existing active player in home team
        const homePlayerBtns = document.querySelectorAll('#home-active-players .player-btn');
        homePlayerBtns.forEach(btn => btn.classList.remove('active'));
        
        // Clear any existing active player in away team
        const awayPlayerBtns = document.querySelectorAll('#away-active-players .player-btn');
        awayPlayerBtns.forEach(btn => btn.classList.remove('active'));
        
        // Clear home team selection when away team player is selected
        this.homeSelectedPlayer = null;
        
        // Set the border color of the stat buttons container based on team
        const statButtonsContainer = document.getElementById('stat-buttons-container');
        if (statButtonsContainer) {
            statButtonsContainer.classList.remove('home-active');
            
            if (this.awaySelectedPlayer) {
                statButtonsContainer.classList.add('away-active');
                
                // Activate the player button
                const playerBtn = document.querySelector(`#away-active-players .player-btn[data-player-id="${this.awaySelectedPlayer.id}"]`);
                if (playerBtn) {
                    playerBtn.classList.add('active');
                }
                
                // Update player selected indicator
                const playerSelectedIndicator = document.getElementById('player-selected-indicator');
                if (playerSelectedIndicator) {
                    playerSelectedIndicator.textContent = `#${this.awaySelectedPlayer.number} ${this.awaySelectedPlayer.name}`;
                    playerSelectedIndicator.classList.add('visible');
                    playerSelectedIndicator.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--away-color');
                    playerSelectedIndicator.style.color = 'white';
                }
                
                // Update hidden span for JS references
                const selectedPlayerDisplay = document.getElementById('away-selected-player');
                if (selectedPlayerDisplay) {
                    selectedPlayerDisplay.textContent = `#${this.awaySelectedPlayer.number} ${this.awaySelectedPlayer.name}`;
                }
            } else {
                statButtonsContainer.classList.remove('home-active');
                
                // Update player selected indicator
                const playerSelectedIndicator = document.getElementById('player-selected-indicator');
                if (playerSelectedIndicator) {
                    playerSelectedIndicator.textContent = 'No player selected';
                    playerSelectedIndicator.style.backgroundColor = '#ececec'; // Neutral color
                    playerSelectedIndicator.style.color = 'black';
                }
                
                // Update hidden span for JS references
                const selectedPlayerDisplay = document.getElementById('home-selected-player');
                if (selectedPlayerDisplay) {
                    selectedPlayerDisplay.textContent = 'None';
                }
            }
        }
    },
    
    /**
     * Update the action log with a new entry
     * @param {Object} logEntry - Action log entry
     */
    updateActionLog: function(logEntry) {
        const logContainer = document.getElementById('log-entries');
        if (!logContainer) return;
        
        const entryElement = document.createElement('div');
        
        // Check if this is a separator
        if (logEntry.separator) {
            entryElement.className = 'log-entry separator';
        } else {
            entryElement.className = 'log-entry';
            
            // Add team-specific class based on the team in logEntry
            if (logEntry.team === 'home') {
                entryElement.classList.add('home-log-entry');
            } else if (logEntry.team === 'away') {
                entryElement.classList.add('away-log-entry');
            }
        }
        
        // Format the log entry
        let logText = logEntry.description;
        
        entryElement.textContent = logText;
        
        // Add to the top of the log
        logContainer.insertBefore(entryElement, logContainer.firstChild);
    },
    
    /**
     * Generate box score data - without minutes and plusMinus
     * @param {String} teamType - 'home' or 'away'
     * @returns {Object} Box score data
     */
    generateBoxScore: function(teamType) {
        if (!this.currentGame) return null;
        
        const team = teamType === 'home' ? this.currentGame.homeTeam : this.currentGame.awayTeam;
        
        return {
            teamName: team.name,
            players: team.players.map(player => {
                // Calculate points
                const twoPoints = (player.fgm - player.tpm) * 2;
                const threePoints = player.tpm * 3;
                const freeThrows = player.ftm;
                const points = twoPoints + threePoints + freeThrows;
                
                // Calculate percentages
                const fgPercent = player.fga > 0 ? (player.fgm / player.fga * 100).toFixed(1) : '0.0';
                const tpPercent = player.tpa > 0 ? (player.tpm / player.tpa * 100).toFixed(1) : '0.0';
                const ftPercent = player.fta > 0 ? (player.ftm / player.fta * 100).toFixed(1) : '0.0';
                
                return {
                    ...player,
                    points: points,
                    fgPercent: fgPercent,
                    tpPercent: tpPercent,
                    ftPercent: ftPercent,
                    rebounds: (player.oreb + player.dreb)
                    // Removed: minutes and plusMinus properties
                };
            }),
            totals: StatsCalculator.calculateTeamStats(team.players).totals
        };
    },
    
    /**
     * Generate advanced stats dashboard data
     * Enhanced with possession and shot data
     * @returns {Object} Dashboard data
     */
    generateDashboardData: function() {
        if (!this.currentGame) return null;

        
        const homeStats = StatsCalculator.calculateTeamStats(this.currentGame.homeTeam.players);
        const awayStats = StatsCalculator.calculateTeamStats(this.currentGame.awayTeam.players);
        
        // Estimate possessions for each team
        const homePossessions = StatsCalculator.estimatePossessions(homeStats);
        const awayPossessions = StatsCalculator.estimatePossessions(awayStats);
        
        // Use average of both teams' possessions
        const possessions = (homePossessions + awayPossessions) / 2;
        
        // Calculate advanced stats
        const homeAdvanced = StatsCalculator.calculateAdvancedStats(homeStats, awayStats, possessions);
        const awayAdvanced = StatsCalculator.calculateAdvancedStats(awayStats, homeStats, possessions);
        
        // Process shot data
        const shotData = this.processShotDataForDashboard();
        
        return {
            teams: {
                home: {
                    name: this.currentGame.homeTeam.name,
                    stats: homeStats,
                    advanced: homeAdvanced,
                    shotStats: shotData.home
                },
                away: {
                    name: this.currentGame.awayTeam.name,
                    stats: awayStats,
                    advanced: awayAdvanced,
                    shotStats: shotData.away
                }
            },
            possessions: possessions.toFixed(1),
            actualPossessions: this.currentGame.possessions ? this.currentGame.possessions.length : 0,
            shotData: shotData
        
        };
    },
    
    /**
     * Process shot data for the dashboard
     * @returns {Object} Processed shot data
     */
    processShotData: function() {
        if (!this.currentGame || !this.currentGame.shotData) {
            return {
                home: { makes: {}, misses: {}, total: 0, makeTotal: 0, missTotal: 0 },
                away: { makes: {}, misses: {}, total: 0, makeTotal: 0, missTotal: 0 },
                locations: []
            };
        }
        
        const shotData = this.currentGame.shotData;
        const locations = [
            'rim', 'paint-far',
            'midrange-right', 'midrange-right-corner', 'midrange-left', 'midrange-left-corner', 'midrange-top',
            '3pt-right-corner', '3pt-right-wing', '3pt-top', '3pt-left-wing', '3pt-left-corner'
        ];
        
        // Initialize result object
        const result = {
            home: { 
                makes: {}, 
                misses: {},
                total: 0,
                makeTotal: 0,
                missTotal: 0
            },
            away: { 
                makes: {}, 
                misses: {},
                total: 0,
                makeTotal: 0,
                missTotal: 0
            },
            locations: locations
        };
        
        // Initialize counters for each location
        locations.forEach(location => {
            result.home.makes[location] = 0;
            result.home.misses[location] = 0;
            result.away.makes[location] = 0;
            result.away.misses[location] = 0;
        });
        
        // Process each shot
        shotData.forEach(shot => {
            const team = shot.team;
            const location = shot.location;
            
            if (locations.includes(location)) {
                if (shot.isMake) {
                    result[team].makes[location]++;
                    result[team].makeTotal++;
                } else {
                    result[team].misses[location]++;
                    result[team].missTotal++;
                }
                result[team].total++;
            }
        });
        
        return result;
    },
    
    /**
     * Undo the last stat action for a specific team
     * @param {String} teamType - 'home' or 'away' team
     * @returns {Boolean} Success status
     */
    undoLastAction: function(teamType) {
        if (!this.currentGame || this.actionLog.length === 0) {
            return false;
        }
        
        // Find the last action for this team
        let lastActionIndex = -1;
        
        for (let i = this.actionLog.length - 1; i >= 0; i--) {
            if (this.actionLog[i].team === teamType) {
                lastActionIndex = i;
                break;
            }
        }
        
        if (lastActionIndex === -1) {
            return false; // No actions for this team
        }
        
        const lastAction = this.actionLog[lastActionIndex];
        const team = lastAction.team === 'home' ? this.currentGame.homeTeam : this.currentGame.awayTeam;
        const player = team.players.find(p => p.name === lastAction.player && p.number === lastAction.playerNumber);
        
        if (!player) return false;
        
        // Revert the stat based on type
        let scoreChange = 0;
        
        switch (lastAction.statType) {
            case 'fga':
                player.fga--;
                break;
                
            case 'fgm':
                player.fgm--;
                player.fga--;
                scoreChange = -2;
                team.score -= 2;
                break;
                
            case '3pa':
                player.tpa--;
                player.fga--;
                break;
                
            case '3pm':
                player.tpm--;
                player.tpa--;
                player.fgm--;
                player.fga--;
                scoreChange = -3;
                team.score -= 3;
                break;
                
            case 'fta':
                player.fta--;
                break;
                
            case 'ftm':
                player.ftm--;
                player.fta--;
                scoreChange = -1;
                team.score -= 1;
                break;
                
            case 'oreb':
                player.oreb--;
                break;
                
            case 'dreb':
                player.dreb--;
                break;
                
            case 'ast':
                player.ast--;
                break;
                
            case 'stl':
                player.stl--;
                break;
                
            case 'blk':
                player.blk--;
                break;
                
            case 'tov':
                player.to--;
                break;
                
            case 'pf':
                player.pf--;
                break;
                
            case 'paint':
                player.paintTouch--;
                break;
                
            default:
                return false;
        }
        
        // Remove the action from log
        this.actionLog.splice(lastActionIndex, 1);
        
        // Save current game state
        this.saveGameState();
        
        // Update UI
        this.updateGameUI();
        
        return true;
    },

    
    /**
 * Add this to your GameTracker object to correctly process shot data for the dashboard
 */

/**
 * Process shot data for the dashboard
 * This function will create the shot statistics needed for the dashboard
 * @returns {Object} Processed shot data
 */
processShotDataForDashboard: function() {
    if (!this.currentGame || !this.currentGame.shotData) {
        return {
            home: { makes: {}, misses: {}, total: {} },
            away: { makes: {}, misses: {}, total: {} }
        };
    }
    
    console.log("Processing shot data for dashboard");
    console.log("Raw shot data:", this.currentGame.shotData);
    
    // Initialize result structure
    const result = {
        home: { 
            makes: { rim: 0, paint: 0 },
            misses: { rim: 0, paint: 0 },
            total: { rim: 0, paint: 0 }
        },
        away: { 
            makes: { rim: 0, paint: 0 },
            misses: { rim: 0, paint: 0 },
            total: { rim: 0, paint: 0 }
        }
    };
    
    // Process each shot in the data
    this.currentGame.shotData.forEach(shot => {
        const team = shot.team; // 'home' or 'away'
        const location = shot.location;
        const isMake = shot.isMake;
        const is3pt = shot.is3pt;
        
        // Skip if the team isn't valid
        if (team !== 'home' && team !== 'away') return;
        
        // Categorize the shot
        let category = '';
        
        // Determine the category based on location
        if (location === 'rim' || location === 'restricted-area') {
            category = 'rim';
        } else if (location === 'paint-far' || location === 'paint') {
            category = 'paint';
        } else if (location.includes('3pt')) {
            category = '3pt';
        } else {
            category = 'midrange';
        }
        
        // Create the category if it doesn't exist
        if (!result[team].makes[category]) {
            result[team].makes[category] = 0;
            result[team].misses[category] = 0;
            result[team].total[category] = 0;
        }
        
        // Update the counts
        if (isMake) {
            result[team].makes[category]++;
        } else {
            result[team].misses[category]++;
        }
        result[team].total[category]++;
        
        // Also track in the original location for detailed analysis
        if (!result[team].makes[location]) {
            result[team].makes[location] = 0;
            result[team].misses[location] = 0;
            result[team].total[location] = 0;
        }
        
        if (isMake) {
            result[team].makes[location]++;
        } else {
            result[team].misses[location]++;
        }
        result[team].total[location]++;
    });
    
    // Calculate aggregated 3-point and midrange totals
    ['home', 'away'].forEach(team => {
        // Calculate 3-point totals
        result[team].makes['3pts_total'] = 0;
        result[team].misses['3pts_total'] = 0;
        result[team].total['3pts_total'] = 0;
        
        // Calculate midrange totals for 'OTHER' category
        result[team].makes['other_total'] = 0;
        result[team].misses['other_total'] = 0;
        result[team].total['other_total'] = 0;
        
        Object.keys(result[team].total).forEach(key => {
            if (key.includes('3pt')) {
                result[team].makes['3pts_total'] += result[team].makes[key];
                result[team].misses['3pts_total'] += result[team].misses[key];
                result[team].total['3pts_total'] += result[team].total[key];
            } else if (key.includes('midrange') || key === 'paint') {
                result[team].makes['other_total'] += result[team].makes[key];
                result[team].misses['other_total'] += result[team].misses[key];
                result[team].total['other_total'] += result[team].total[key];
            }
        });
    });
    
    console.log("Processed shot data:", result);
    return result;
}

};



/**
 * Completely redesigned dashboard based on the provided template
 * Replaces shot charts with shooting zone tables and game stats
 */

/**
 * Render the dashboard with stats and zone shooting tables
 */
/**
 * Updated renderDashboard function that correctly displays zone shooting and ESQ data
 */
function renderDashboard() {
    if (!GameTracker.currentGame) {
        // Try to get most recent game
        const games = DB.getGames();
        if (games.length > 0) {
            GameTracker.currentGame = games[games.length - 1];
        } else {
            document.getElementById('dashboard-container').innerHTML = '<p>No game data available</p>';
            return;
        }
    }
    
    // Get dashboard data
    const dashboardData = GameTracker.generateDashboardData();
    if (!dashboardData) {
        document.getElementById('dashboard-container').innerHTML = '<p>No dashboard data available</p>';
        return;
    }
    
    console.log("Dashboard data:", dashboardData);
    
    // Force initialization of shot data if missing
    if (!dashboardData.shotData) {
        dashboardData.shotData = { home: {}, away: {} };
    }
    if (!dashboardData.teams.home.shotStats) {
        dashboardData.teams.home.shotStats = { makes: {}, misses: {}, total: {} };
    }
    if (!dashboardData.teams.away.shotStats) {
        dashboardData.teams.away.shotStats = { makes: {}, misses: {}, total: {} };
    }
    
    // Get team names
    const homeTeamName = GameTracker.currentGame.homeTeam.name;
    const awayTeamName = GameTracker.currentGame.awayTeam.name;
    
    // Format each stat safely to avoid errors
    function safeStat(stat, defaultValue = '0') {
        return (stat !== undefined && stat !== null) ? stat : defaultValue;
    }
    
    // Get rim shot data
    const homeRimMakes = dashboardData.teams.home.shotStats.makes.rim || 0;
    const homeRimTotal = dashboardData.teams.home.shotStats.total.rim || 0;
    const awayRimMakes = dashboardData.teams.away.shotStats.makes.rim || 0;
    const awayRimTotal = dashboardData.teams.away.shotStats.total.rim || 0;
    
    // Get 3pt shot data
    const home3ptMakes = dashboardData.teams.home.shotStats.makes['3pts_total'] || 0;
    const home3ptTotal = dashboardData.teams.home.shotStats.total['3pts_total'] || 0;
    const away3ptMakes = dashboardData.teams.away.shotStats.makes['3pts_total'] || 0;
    const away3ptTotal = dashboardData.teams.away.shotStats.total['3pts_total'] || 0;
    
    // Get other shot data
    const homeOtherMakes = dashboardData.teams.home.shotStats.makes['other_total'] || 0;
    const homeOtherTotal = dashboardData.teams.home.shotStats.total['other_total'] || 0;
    const awayOtherMakes = dashboardData.teams.away.shotStats.makes['other_total'] || 0;
    const awayOtherTotal = dashboardData.teams.away.shotStats.total['other_total'] || 0;
    
    // Format shooting stats
    function formatStat(makes, total) {
        if (total === 0) return "0/0 (0.0%)";
        const percentage = (makes / total * 100).toFixed(1);
        return `${makes}/${total} (${percentage}%)`;
    }
    
    // Calculate total shots for frequency
    const homeTotalShots = homeRimTotal + home3ptTotal + homeOtherTotal || 1; // Avoid division by zero
    const awayTotalShots = awayRimTotal + away3ptTotal + awayOtherTotal || 1; // Avoid division by zero
    
    // Format frequency stats
    function formatFrequency(count, total) {
        if (total === 0) return "0/0 (0.0%)";
        const percentage = (count / total * 100).toFixed(1);
        return `${count}/${total} (${percentage}%)`;
    }
    
    // Calculate ESQ (Effective Shot Quality)
    function getAverageESQ(team) {
        if (!GameTracker.currentGame || !GameTracker.currentGame.shotData) return "0.0";
        
        const teamShots = GameTracker.currentGame.shotData.filter(shot => shot.team === team && shot.quality);
        if (teamShots.length === 0) return "0.0";
        
        const totalQuality = teamShots.reduce((sum, shot) => sum + shot.quality, 0);
        return (totalQuality / teamShots.length).toFixed(1);
    }
    
    // Create dashboard HTML
    const dashboardHTML = `

    <div class="dashboard-section">
            <div class="stats-table-container">
                <div class="stats-header yellow-header">
                    <h3>GAME STATS</h3>
                </div>
                <table class="stats-table stats-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th class="team-header home-header">${homeTeamName}</th>
                            <th class="team-header away-header">${awayTeamName}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="stat-label">PAINT%</td>
                            <td>${safeStat(dashboardData.teams.home.advanced.paintPct)}%</td>
                            <td>${safeStat(dashboardData.teams.away.advanced.paintPct)}%</td>
                        </tr>
                        <tr>
                            <td class="stat-label">EFG%</td>
                            <td>${safeStat(dashboardData.teams.home.stats.percentages.efg)}%</td>
                            <td>${safeStat(dashboardData.teams.away.stats.percentages.efg)}%</td>
                        </tr>
                        <tr>
                            <td class="stat-label">ORB%</td>
                            <td>${safeStat(dashboardData.teams.home.advanced.orebPct)}%</td>
                            <td>${safeStat(dashboardData.teams.away.advanced.orebPct)}%</td>
                        </tr>
                        <tr>
                            <td class="stat-label">TOV%</td>
                            <td>${safeStat(dashboardData.teams.home.advanced.tovRatio)}%</td>
                            <td>${safeStat(dashboardData.teams.away.advanced.tovRatio)}%</td>
                        </tr>
                        <tr>
                            <td class="stat-label">AST RATE</td>
                            <td>${safeStat(dashboardData.teams.home.advanced.astRatio)}%</td>
                            <td>${safeStat(dashboardData.teams.away.advanced.astRatio)}%</td>
                        </tr>
                        <tr>
                            <td class="stat-label">AVG ESQ</td>
                            <td>${getAverageESQ('home')}</td>
                            <td>${getAverageESQ('away')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="stats-table-container">
                <div class="stats-header yellow-header">
                    <h3>MARGINS</h3>
                </div>
                <table class="stats-table stats-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th class="team-header home-header">${homeTeamName}</th>
                            <th class="team-header away-header">${awayTeamName}</th>
                            <th class="team-header">NET</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="stat-label">2FG</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td class="stat-label">3FG</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td class="stat-label">TOVs</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td class="stat-label">OREBs</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td class="stat-label">FTs</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td class="stat-label">TOTAL</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="dashboard-section">
            <div class="stats-table-container">
                <div class="stats-header yellow-header">
                    <h3>SHOOTING BY ZONE</h3>
                </div>
                <table class="stats-table zone-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th class="team-header home-header">${homeTeamName}</th>
                            <th class="team-header away-header">${awayTeamName}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="zone-label">RIM</td>
                            <td>${formatStat(homeRimMakes, homeRimTotal)}</td>
                            <td>${formatStat(awayRimMakes, awayRimTotal)}</td>
                        </tr>
                        <tr>
                            <td class="zone-label">3'S</td>
                            <td>${formatStat(home3ptMakes, home3ptTotal)}</td>
                            <td>${formatStat(away3ptMakes, away3ptTotal)}</td>
                        </tr>
                        <tr>
                            <td class="zone-label">OTHER</td>
                            <td>${formatStat(homeOtherMakes, homeOtherTotal)}</td>
                            <td>${formatStat(awayOtherMakes, awayOtherTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="stats-table-container">
            <div class="stats-header yellow-header">
                <h3>FREQUENCY BY ZONE</h3>
            </div>
            <table class="stats-table zone-table">
                <thead>
                    <tr>
                        <th></th>
                        <th class="team-header home-header">${homeTeamName}</th>
                        <th class="team-header away-header">${awayTeamName}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="zone-label">RIM</td>
                        <td>${formatFrequency(homeRimTotal, homeTotalShots)}</td>
                        <td>${formatFrequency(awayRimTotal, awayTotalShots)}</td>
                    </tr>
                    <tr>
                        <td class="zone-label">3'S</td>
                        <td>${formatFrequency(home3ptTotal, homeTotalShots)}</td>
                        <td>${formatFrequency(away3ptTotal, awayTotalShots)}</td>
                    </tr>
                    <tr>
                        <td class="zone-label">OTHER</td>
                        <td>${formatFrequency(homeOtherTotal, homeTotalShots)}</td>
                        <td>${formatFrequency(awayOtherTotal, awayTotalShots)}</td>
                    </tr>
                </tbody>
            </table>
        </div>



        </div>
        
        <div class="dashboard-section">

        </div>
        
        
    `;
    
    // Update dashboard container
    const dashboardContainer = document.getElementById('dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.innerHTML = dashboardHTML;
    }
    
    // Update possession stats (keeping this part from the original)
    document.getElementById('total-possessions').textContent = dashboardData.actualPossessions;
    
    const homePossessions = GameTracker.currentGame.possessions 
        ? GameTracker.currentGame.possessions.filter(p => p.team === 'home').length 
        : 0;
    document.getElementById('home-possessions').textContent = homePossessions;
    
    const awayPossessions = GameTracker.currentGame.possessions 
        ? GameTracker.currentGame.possessions.filter(p => p.team === 'away').length 
        : 0;
    document.getElementById('away-possessions').textContent = awayPossessions;
    
    // Calculate average possession time
    let totalDuration = 0;
    if (GameTracker.currentGame.possessions) {
        GameTracker.currentGame.possessions.forEach(p => {
            totalDuration += p.duration || 0;
        });
    }
    const avgDuration = dashboardData.actualPossessions > 0 
        ? (totalDuration / dashboardData.actualPossessions / 1000).toFixed(1) 
        : "0.0";
    document.getElementById('avg-possession-time').textContent = avgDuration;
}

/**
 * Helper function to format shot stats in the form "makes/attempts (percentage%)"
 * @param {Number} makes - Number of makes
 * @param {Number} attempts - Number of attempts
 * @returns {String} Formatted stat
 */
function formatShotStat(makes, attempts) {
    // Handle cases where parameters might be undefined
    makes = makes || 0;
    attempts = attempts || 0;
    
    // Avoid division by zero
    if (!attempts) return "0/0 (0.0%)";
    
    const percentage = (makes / attempts * 100).toFixed(1);
    return `${makes}/${attempts} (${percentage}%)`;
}

/**
 * Helper function to format frequency stats in the form "attempts/total (percentage%)"
 * @param {Number} attempts - Number of attempts in zone
 * @param {Number} total - Total shot attempts
 * @returns {String} Formatted stat
 */
function formatFrequencyStat(attempts, total) {
    if (!total) return "0/0 (0.0%)";
    const percentage = (attempts / total * 100).toFixed(1);
    return `${attempts}/${total} (${percentage}%)`;
}

/**
 * Helper function to get total three-point attempts
 * @param {Object} shotStats - Shot statistics object
 * @returns {Number} Total three-point attempts
 */
function getThreePointAttempts(shotStats) {
    return (
        (shotStats.total['3pt-left-corner'] || 0) +
        (shotStats.total['3pt-left-wing'] || 0) +
        (shotStats.total['3pt-top'] || 0) +
        (shotStats.total['3pt-right-wing'] || 0) +
        (shotStats.total['3pt-right-corner'] || 0)
    );
}

/**
 * Helper function to get total three-point makes
 * @param {Object} shotStats - Shot statistics object
 * @returns {Number} Total three-point makes
 */
function getThreePointMakes(shotStats) {
    return (
        (shotStats.makes['3pt-left-corner'] || 0) +
        (shotStats.makes['3pt-left-wing'] || 0) +
        (shotStats.makes['3pt-top'] || 0) +
        (shotStats.makes['3pt-right-wing'] || 0) +
        (shotStats.makes['3pt-right-corner'] || 0)
    );
}

/**
 * Helper function to get "other" attempts (mid-range, not rim or 3pt)
 * @param {Object} shotStats - Shot statistics object
 * @returns {Number} Total "other" attempts
 */
function getOtherAttempts(shotStats) {
    return (
        (shotStats.total['paint-far'] || 0) +
        (shotStats.total['midrange-left'] || 0) +
        (shotStats.total['midrange-right'] || 0) +
        (shotStats.total['midrange-left-corner'] || 0) +
        (shotStats.total['midrange-right-corner'] || 0) +
        (shotStats.total['midrange-top'] || 0)
    );
}

/**
 * Helper function to get "other" makes (mid-range, not rim or 3pt)
 * @param {Object} shotStats - Shot statistics object
 * @returns {Number} Total "other" makes
 */
function getOtherMakes(shotStats) {
    return (
        (shotStats.makes['paint-far'] || 0) +
        (shotStats.makes['midrange-left'] || 0) +
        (shotStats.makes['midrange-right'] || 0) +
        (shotStats.makes['midrange-left-corner'] || 0) +
        (shotStats.makes['midrange-right-corner'] || 0) +
        (shotStats.makes['midrange-top'] || 0)
    );
}

/**
 * Helper function to get total shot attempts
 * @param {Object} shotStats - Shot statistics object
 * @returns {Number} Total shot attempts
 */
function getTotalShots(shotStats) {
    return getThreePointAttempts(shotStats) + getOtherAttempts(shotStats) + (shotStats.total['rim'] || 0);
}

/**
 * Calculate the average Effective Shot Quality (ESQ) from shot data
 * @param {Object} shotData - Team shot data
 * @returns {Number} Average shot quality (1-10 scale)
 */
/**
 * Improved ESQ calculation to handle your specific data structure
 */
function calculateAverageESQ(shotData) {
    // Handle cases where shotData is undefined
    if (!shotData) return 0;
    
    console.log("Calculating ESQ for", shotData);
    
    // First try using the current game's shotData array if it exists
    if (GameTracker.currentGame && GameTracker.currentGame.shotData && Array.isArray(GameTracker.currentGame.shotData)) {
        console.log("Using current game shotData array");
        let totalQuality = 0;
        let totalShots = 0;
        
        // Filter shots by the team if we can determine which team
        const teamShotData = GameTracker.currentGame.shotData.filter(shot => {
            // Try to match by team name or use all shots if we can't determine
            return true; // Just use all shots for now to debug
        });
        
        if (teamShotData.length > 0) {
            console.log("Found shot data:", teamShotData);
            teamShotData.forEach(shot => {
                if (shot.quality) {
                    totalQuality += shot.quality;
                    totalShots++;
                }
            });
            
            return totalShots > 0 ? totalQuality / totalShots : 0;
        }
    }
    
    // If we get here, we couldn't calculate using the expected structure
    console.log("Could not calculate ESQ using expected structure");
    return 0;
}



/**
 * Improved function to get rim shots in case the structure is different
 */
function getRimShots(shotStats) {
    if (!shotStats) return { makes: 0, attempts: 0 };
    
    // Try different possible locations for rim shots based on your data structure
    let makes = 0;
    let attempts = 0;
    
    // Check if rim or restricted-area data exists
    if (shotStats.makes && shotStats.makes.rim) {
        makes = shotStats.makes.rim;
    } else if (shotStats.makes && shotStats.makes['restricted-area']) {
        makes = shotStats.makes['restricted-area'];
    }
    
    if (shotStats.total && shotStats.total.rim) {
        attempts = shotStats.total.rim;
    } else if (shotStats.total && shotStats.total['restricted-area']) {
        attempts = shotStats.total['restricted-area'];
    } else if (shotStats.misses && shotStats.misses.rim) {
        // If we have makes and misses, but not total
        attempts = makes + shotStats.misses.rim;
    }
    
    return { makes, attempts };
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

// Function to load team colors from localStorage
function loadTeamColors() {
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


/**
 * Add debug logging to see the actual shotStats structure
 * Place this at the start of the renderDashboard function
 */
function logShotData(dashboardData) {
    console.log("Dashboard data:", dashboardData);
    
    // Log shot data structure
    if (dashboardData.shotData) {
        console.log("Shot data structure:", dashboardData.shotData);
    }
    
    // Log home team shot stats
    if (dashboardData.teams && dashboardData.teams.home && dashboardData.teams.home.shotStats) {
        console.log("Home team shot stats:", dashboardData.teams.home.shotStats);
    }
}
