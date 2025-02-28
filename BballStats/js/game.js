/**
 * Game Tracking Functionality
 * Handles the active game tracking and statistics
 */

const GameTracker = {
    // Current game state
    currentGame: null,
    homeSelectedPlayer: null,
    awaySelectedPlayer: null,
    period: 1,
    actionLog: [],
    
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
            }
        };
        
        this.actionLog = [];
        this.homeSelectedPlayer = null;
        this.awaySelectedPlayer = null;
        this.period = 1;
        
        // Save initial game state
        DB.saveCurrentGame(this.currentGame);
        
        // Update UI
        this.updateGameUI();
    },
    
    /**
     * Initialize player stats objects
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
                paintTouch: 0,
                minutes: 0,
                plusMinus: 0
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
     * Record a statistic for the home team's selected player
     * @param {String} statType - Type of stat to record
     * @returns {Boolean} Success status
     */
    recordHomeStat: function(statType) {
        if (!this.currentGame || !this.homeSelectedPlayer) {
            return false;
        }
        
        const player = this.currentGame.homeTeam.players.find(p => p.id === this.homeSelectedPlayer.id);
        
        if (!player) return false;
        
        return this.recordStat(statType, player, 'home', this.currentGame.homeTeam);
    },
    
    /**
     * Record a statistic for the away team's selected player
     * @param {String} statType - Type of stat to record
     * @returns {Boolean} Success status
     */
    recordAwayStat: function(statType) {
        if (!this.currentGame || !this.awaySelectedPlayer) {
            return false;
        }
        
        const player = this.currentGame.awayTeam.players.find(p => p.id === this.awaySelectedPlayer.id);
        
        if (!player) return false;
        
        return this.recordStat(statType, player, 'away', this.currentGame.awayTeam);
    },
    
    /**
     * Record a statistic for a player
     * @param {String} statType - Type of stat to record
     * @param {Object} player - Player object
     * @param {String} teamType - 'home' or 'away'
     * @param {Object} team - Team object
     * @returns {Boolean} Success status
     */
    recordStat: function(statType, player, teamType, team) {
        let scoreChange = 0;
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
                logEntry.description = `${player.number} ${player.name} field goal attempt`;
                break;
                
            case 'fgm':
                player.fgm++;
                player.fga++;
                scoreChange = 2;
                team.score += 2;
                logEntry.description = `${player.number} ${player.name} made 2pt field goal`;
                break;
                
            case '3pa':
                player.tpa++;
                player.fga++;
                logEntry.description = `${player.number} ${player.name} 3pt attempt`;
                break;
                
            case '3pm':
                player.tpm++;
                player.tpa++;
                player.fgm++;
                player.fga++;
                scoreChange = 3;
                team.score += 3;
                logEntry.description = `${player.number} ${player.name} made 3pt field goal`;
                break;
                
            case 'fta':
                player.fta++;
                logEntry.description = `${player.number} ${player.name} free throw attempt`;
                break;
                
            case 'ftm':
                player.ftm++;
                player.fta++;
                scoreChange = 1;
                team.score += 1;
                logEntry.description = `${player.number} ${player.name} made free throw`;
                break;
                
            case 'oreb':
                player.oreb++;
                logEntry.description = `${player.number} ${player.name} offensive rebound`;
                break;
                
            case 'dreb':
                player.dreb++;
                logEntry.description = `${player.number} ${player.name} defensive rebound`;
                break;
                
            case 'ast':
                player.ast++;
                logEntry.description = `${player.number} ${player.name} assist`;
                break;
                
            case 'stl':
                player.stl++;
                logEntry.description = `${player.number} ${player.name} steal`;
                break;
                
            case 'blk':
                player.blk++;
                logEntry.description = `${player.number} ${player.name} block`;
                break;
                
            case 'tov':
                player.to++;
                logEntry.description = `${player.number} ${player.name} turnover`;
                break;
                
            case 'pf':
                player.pf++;
                logEntry.description = `${player.number} ${player.name} foul`;
                break;
                
            case 'paint':
                player.paintTouch++;
                logEntry.description = `${player.number} ${player.name} paint touch`;
                break;
                
            case 'undo':
                return this.undoLastAction(teamType);
                
            default:
                return false;
        }
        
        // Add to action log
        this.actionLog.push(logEntry);
        
        // Update game scores
        if (scoreChange > 0) {
            // Update plus/minus for player
            player.plusMinus += scoreChange;
        }
        
        // Save current game state
        this.saveGameState();
        
        // Update UI
        this.updateGameUI();
        this.updateActionLog(logEntry);
        
        return true;
    },
    
    /**
     * End the current period
     */
    endPeriod: function() {
        if (!this.currentGame) return;
        
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
            document.getElementById('game-period').textContent = `2nd`;
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
        //document.getElementById('home-team-name').textContent = this.currentGame.homeTeam.name;
        //document.getElementById('away-team-name').textContent = this.currentGame.awayTeam.name;
        
        // Update period display
        if (this.period == 1)
            document.getElementById('game-period').textContent = `1st`;
        if (this.period > 1)
            document.getElementById('game-period').textContent = `2nd`;
        
        // Update player selections
        this.renderHomePlayerSelection();
        this.renderAwayPlayerSelection();
        this.updateHomePlayerSelection();
        this.updateAwayPlayerSelection();
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
            playerBtn.textContent = `${player.number} ${player.name}`;
            
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
            playerBtn.textContent = `${player.number} ${player.name}`;
            
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
     * Update home team selected player display
     */
    updateHomePlayerSelection: function() {
        // Clear any existing active player
        const playerBtns = document.querySelectorAll('#home-active-players .player-btn');
        playerBtns.forEach(btn => btn.classList.remove('active'));
        
        // Display selected player name
        const selectedPlayerDisplay = document.getElementById('home-selected-player');
        if (!selectedPlayerDisplay) return;
        
        if (this.homeSelectedPlayer) {
            selectedPlayerDisplay.textContent = `#${this.homeSelectedPlayer.number} ${this.homeSelectedPlayer.name}`;
            
            // Activate the player button
            const playerBtn = document.querySelector(`#home-active-players .player-btn[data-player-id="${this.homeSelectedPlayer.id}"]`);
            if (playerBtn) {
                playerBtn.classList.add('active');
            }
        } else {
            selectedPlayerDisplay.textContent = 'No player selected';
        }
    },
    
    /**
     * Update away team selected player display
     */
    updateAwayPlayerSelection: function() {
        // Clear any existing active player
        const playerBtns = document.querySelectorAll('#away-active-players .player-btn');
        playerBtns.forEach(btn => btn.classList.remove('active'));
        
        // Display selected player name
        const selectedPlayerDisplay = document.getElementById('away-selected-player');
        if (!selectedPlayerDisplay) return;
        
        if (this.awaySelectedPlayer) {
            selectedPlayerDisplay.textContent = `#${this.awaySelectedPlayer.number} ${this.awaySelectedPlayer.name}`;
            
            // Activate the player button
            const playerBtn = document.querySelector(`#away-active-players .player-btn[data-player-id="${this.awaySelectedPlayer.id}"]`);
            if (playerBtn) {
                playerBtn.classList.add('active');
            }
        } else {
            selectedPlayerDisplay.textContent = 'No player selected';
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
        entryElement.className = 'log-entry';
        
        // Format the log entry
        let logText = logEntry.description;
        
        entryElement.textContent = logText;
        
        // Add to the top of the log
        logContainer.insertBefore(entryElement, logContainer.firstChild);
    },
    
    /**
     * Generate box score data
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
                };
            }),
            totals: StatsCalculator.calculateTeamStats(team.players).totals
        };
    },
    
    /**
     * Generate advanced stats dashboard data
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
        
        return {
            teams: {
                home: {
                    name: this.currentGame.homeTeam.name,
                    stats: homeStats,
                    advanced: homeAdvanced
                },
                away: {
                    name: this.currentGame.awayTeam.name,
                    stats: awayStats,
                    advanced: awayAdvanced
                }
            },
            possessions: possessions.toFixed(1)
        };
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
                
            case 'to':
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
        
        // Update plus/minus if score changed
        if (scoreChange !== 0) {
            player.plusMinus += scoreChange;
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