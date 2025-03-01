/**
 * Database Management for Basketball Stat Tracker
 * Uses localStorage for data persistence
 */

const DB = {
    // Storage keys
    KEYS: {
        TEAMS: 'basketball_teams',
        GAMES: 'basketball_games',
        CURRENT_GAME: 'basketball_current_game'
    },
    
    /**
     * Initialize the database
     */
    init: function() {
        // Check if storage exists, if not create it
        if (!localStorage.getItem(this.KEYS.TEAMS)) {
            localStorage.setItem(this.KEYS.TEAMS, JSON.stringify([]));
        }
        
        if (!localStorage.getItem(this.KEYS.GAMES)) {
            localStorage.setItem(this.KEYS.GAMES, JSON.stringify([]));
        }
    },
    
    /**
     * Get all saved teams
     * @returns {Array} Array of team objects
     */
    getTeams: function() {
        return JSON.parse(localStorage.getItem(this.KEYS.TEAMS)) || [];
    },
    
    /**
     * Save a team to storage
     * @param {Object} team - Team object with name and players
     * @returns {Boolean} Success status
     */
    saveTeam: function(team) {
        if (!team.name) return false;
        
        let teams = this.getTeams();
        
        // Check if team already exists
        const existingIndex = teams.findIndex(t => t.name === team.name);
        
        if (existingIndex !== -1) {
            // Update existing team
            teams[existingIndex] = team;
        } else {
            // Add new team
            teams.push(team);
        }
        
        localStorage.setItem(this.KEYS.TEAMS, JSON.stringify(teams));
        return true;
    },
    
    /**
     * Delete a team from storage
     * @param {String} teamName - Name of team to delete
     * @returns {Boolean} Success status
     */
    deleteTeam: function(teamName) {
        let teams = this.getTeams();
        const initialLength = teams.length;
        
        teams = teams.filter(team => team.name !== teamName);
        
        if (teams.length === initialLength) {
            return false; // No team was deleted
        }
        
        localStorage.setItem(this.KEYS.TEAMS, JSON.stringify(teams));
        return true;
    },
    
    /**
     * Get a specific team by name
     * @param {String} teamName - Name of team to retrieve
     * @returns {Object|null} Team object or null if not found
     */
    getTeam: function(teamName) {
        const teams = this.getTeams();
        return teams.find(team => team.name === teamName) || null;
    },
    
    /**
     * Get all saved games
     * @returns {Array} Array of game objects
     */
    getGames: function() {
        return JSON.parse(localStorage.getItem(this.KEYS.GAMES)) || [];
    },
    
    /**
     * Save a game to storage
     * @param {Object} game - Game object with teams, players, stats
     * @returns {String} Game ID
     */
    saveGame: function(game) {
        let games = this.getGames();
        
        // If game has no id, create one
        if (!game.id) {
            game.id = 'game_' + Date.now();
        }
        
        // Check if game already exists
        const existingIndex = games.findIndex(g => g.id === game.id);
        
        if (existingIndex !== -1) {
            // Update existing game
            games[existingIndex] = game;
        } else {
            // Add new game
            games.push(game);
        }
        
        localStorage.setItem(this.KEYS.GAMES, JSON.stringify(games));
        return game.id;
    },
    
    /**
     * Delete a game from storage
     * @param {String} gameId - ID of game to delete
     * @returns {Boolean} Success status
     */
    deleteGame: function(gameId) {
        let games = this.getGames();
        const initialLength = games.length;
        
        games = games.filter(game => game.id !== gameId);
        
        if (games.length === initialLength) {
            return false; // No game was deleted
        }
        
        localStorage.setItem(this.KEYS.GAMES, JSON.stringify(games));
        return true;
    },
    
    /**
     * Get a specific game by ID
     * @param {String} gameId - ID of game to retrieve
     * @returns {Object|null} Game object or null if not found
     */
    getGame: function(gameId) {
        const games = this.getGames();
        return games.find(game => game.id === gameId) || null;
    },
    
    /**
     * Save current game in progress
     * @param {Object} gameData - Current game data
     */
    saveCurrentGame: function(gameData) {
        localStorage.setItem(this.KEYS.CURRENT_GAME, JSON.stringify(gameData));
    },
    
    /**
     * Get current game in progress
     * @returns {Object|null} Current game data or null
     */
    getCurrentGame: function() {
        const data = localStorage.getItem(this.KEYS.CURRENT_GAME);
        return data ? JSON.parse(data) : null;
    },
    
    /**
     * Clear current game data
     */
    clearCurrentGame: function() {
        localStorage.removeItem(this.KEYS.CURRENT_GAME);
    },
    
    /**
     * Export all data as JSON
     * @returns {Object} All database data
     */
    exportData: function() {
        return {
            teams: this.getTeams(),
            games: this.getGames(),
            version: '1.0.0',
            exportDate: new Date().toISOString()
        };
    },
    
    /**
     * Import data from JSON
     * @param {Object} data - Data to import
     * @returns {Boolean} Success status
     */
    importData: function(data) {
        try {
            if (data.teams && Array.isArray(data.teams)) {
                localStorage.setItem(this.KEYS.TEAMS, JSON.stringify(data.teams));
            }
            
            if (data.games && Array.isArray(data.games)) {
                localStorage.setItem(this.KEYS.GAMES, JSON.stringify(data.games));
            }
            
            return true;
        } catch (err) {
            console.error('Error importing data:', err);
            return false;
        }
    }
};