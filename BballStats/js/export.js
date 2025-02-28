/**
 * Export and Import Functionality
 * Handles exporting and importing data
 */

const ExportImport = {
    /**
     * Export game data as CSV
     * @param {String} gameId - ID of game to export
     * @returns {Object} File data object with content and filename
     */
    exportGameToCSV: function(gameId) {
        // Get game data
        const game = DB.getGame(gameId);
        
        if (!game) {
            console.error('Game not found:', gameId);
            return null;
        }
        
        // Generate CSV content
        const csvContent = StatsCalculator.exportToCSV(game);
        
        // Format date for filename
        const gameDate = game.date ? new Date(game.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        // Create filename
        const filename = `${game.homeTeam.name}_vs_${game.awayTeam.name}_${gameDate}.csv`;
        
        return {
            content: csvContent,
            filename: filename
        };
    },
    
    /**
     * Export all data as JSON
     * @returns {Object} File data object with content and filename
     */
    exportAllData: function() {
        // Get all data
        const data = DB.exportData();
        
        // Convert to JSON string
        const jsonContent = JSON.stringify(data, null, 2);
        
        // Create filename with date
        const date = new Date().toISOString().split('T')[0];
        const filename = `basketball_stats_backup_${date}.json`;
        
        return {
            content: jsonContent,
            filename: filename
        };
    },
    
    /**
     * Import data from JSON
     * @param {String} jsonContent - JSON content to import
     * @returns {Boolean} Success status
     */
    importData: function(jsonContent) {
        try {
            // Parse JSON content
            const data = JSON.parse(jsonContent);
            
            // Validate data structure
            if (!data.teams || !Array.isArray(data.teams) || 
                !data.games || !Array.isArray(data.games)) {
                console.error('Invalid data format');
                return false;
            }
            
            // Import data
            return DB.importData(data);
        } catch (err) {
            console.error('Error importing data:', err);
            return false;
        }
    },
    
    /**
     * Download file
     * @param {Object} fileData - File data object with content and filename
     */
    downloadFile: function(fileData) {
        if (!fileData || !fileData.content || !fileData.filename) {
            console.error('Invalid file data');
            return;
        }
        
        // Create blob
        const blob = new Blob([fileData.content], { type: 'text/plain' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
};