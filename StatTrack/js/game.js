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
     * Prompt for shot details (quality and location)
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
                <div class="court-area" data-location="midrange-left">Mid-Left</div>
                <div class="court-area" data-location="rim">Rim</div>
                <div class="court-area" data-location="midrange-right">Mid-Right</div>
                <div class="court-area" data-location="paint-far">Paint Far</div>
            `;
        }
        
        // Create the full modal content
        modal.innerHTML = `
            <div class="shot-modal-content">
                <h3>${isMake ? 'Made' : 'Missed'} ${is3pt ? '3PT' : '2PT'} Shot Details</h3>
                <p>#${player.number} ${player.name} - ${teamType === 'home' ? this.currentGame.homeTeam.name : this.currentGame.awayTeam.name}</p>
                
                <div class="shot-quality-section">
                    <h4>Estimated Shot Quality</h4>
                    <div class="shot-quality-buttons">
                        ${Array.from({length: 10}, (_, i) => `<button class="quality-btn" data-quality="${i+1}">${i+1}</button>`).join('')}
                    </div>
                </div>
                
                <div class="shot-location-section">
                    <h4>Shot Location</h4>
                    <div class="court-diagram">
                        <!-- Basketball court diagram will be here -->
                        <div class="court-container">
                            ${courtAreasHTML}
                        </div>
                    </div>
                </div>
                
                <div class="shot-modal-buttons">
                    <button class="shot-modal-cancel">Cancel</button>
                    <button class="shot-modal-save" disabled>Save Shot Details</button>
                </div>
            </div>
        `;
        
        // Add modal to the DOM
        document.body.appendChild(modal);
        
        // Variables to track selection
        let selectedQuality = null;
        let selectedLocation = null;
        
        // Update the Save button state
        const updateSaveButton = () => {
            const saveButton = modal.querySelector('.shot-modal-save');
            saveButton.disabled = !(selectedQuality && selectedLocation);
        };
        
        // Add event listeners
        // Quality buttons
        const qualityButtons = modal.querySelectorAll('.quality-btn');
        qualityButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                qualityButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                selectedQuality = parseInt(this.dataset.quality, 10);
                updateSaveButton();
            });
        });
        
        // Location areas
        const locationAreas = modal.querySelectorAll('.court-area');
        locationAreas.forEach(area => {
            area.addEventListener('click', function() {
                // Remove active class from all areas
                locationAreas.forEach(a => a.classList.remove('active'));
                // Add active class to clicked area
                this.classList.add('active');
                selectedLocation = this.dataset.location;
                updateSaveButton();
            });
        });
        
        // Cancel button
        modal.querySelector('.shot-modal-cancel').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // Save button
        modal.querySelector('.shot-modal-save').addEventListener('click', function() {
            // Save shot details to the player's most recent shot
            const shotDetails = {
                quality: selectedQuality,
                location: selectedLocation,
                timestamp: Date.now(),
                player: player.id,
                team: teamType,
                shotType: shotType,
                isMake: isMake,
                is3pt: is3pt
            };
            
            // Add to shot tracking
            if (!GameTracker.currentGame.shotData) {
                GameTracker.currentGame.shotData = [];
            }
            GameTracker.currentGame.shotData.push(shotDetails);
            
            // Save to game state
            GameTracker.saveGameState();
            
            // Close the modal
            document.body.removeChild(modal);
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
        const shotData = this.processShotData();
        
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
            'midrange-right', 'midrange-center', 'midrange-left',
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
    }
};

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
