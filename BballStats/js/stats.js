/**
 * Basketball Statistics Calculator
 * Handles all calculations for basketball statistics
 */

const StatsCalculator = {
    /**
     * Calculate shooting percentages for a player
     * @param {Object} player - Player stats object
     * @returns {Object} Shooting percentages
     */
    calculateShootingPercentages: function(player) {
        const fgp = player.fga > 0 ? (player.fgm / player.fga * 100).toFixed(1) : '0.0';
        const tpp = player.tpa > 0 ? (player.tpm / player.tpa * 100).toFixed(1) : '0.0';
        const ftp = player.fta > 0 ? (player.ftm / player.fta * 100).toFixed(1) : '0.0';
        
        // Calculate effective field goal percentage
        // eFG% = (FGM + 0.5 * 3PM) / FGA
        const efg = player.fga > 0 
            ? ((player.fgm + 0.5 * player.tpm) / player.fga * 100).toFixed(1) 
            : '0.0';
        
        // Calculate true shooting percentage
        // TS% = PTS / (2 * (FGA + 0.44 * FTA))
        const pts = (player.fgm - player.tpm) * 2 + player.tpm * 3 + player.ftm;
        const ts = (player.fga + 0.44 * player.fta) > 0 
            ? (pts / (2 * (player.fga + 0.44 * player.fta)) * 100).toFixed(1) 
            : '0.0';
        
        return {
            fgp,
            tpp,
            ftp,
            efg,
            ts
        };
    },
    
    /**
     * Calculate basic statistics for a team
     * @param {Array} players - Array of player stats objects
     * @returns {Object} Team totals and percentages
     */
    calculateTeamStats: function(players) {
        // Initialize totals
        const totals = {
            fgm: 0, fga: 0,
            tpm: 0, tpa: 0,
            ftm: 0, fta: 0,
            oreb: 0, dreb: 0, reb: 0,
            ast: 0, stl: 0, blk: 0,
            to: 0, pf: 0,
            paintTouch: 0,
            pts: 0
        };
        
        // Sum up all player stats
        players.forEach(player => {
            totals.fgm += player.fgm || 0;
            totals.fga += player.fga || 0;
            totals.tpm += player.tpm || 0;
            totals.tpa += player.tpa || 0;
            totals.ftm += player.ftm || 0;
            totals.fta += player.fta || 0;
            totals.oreb += player.oreb || 0;
            totals.dreb += player.dreb || 0;
            totals.reb += (player.oreb || 0) + (player.dreb || 0);
            totals.ast += player.ast || 0;
            totals.stl += player.stl || 0;
            totals.blk += player.blk || 0;
            totals.to += player.to || 0;
            totals.pf += player.pf || 0;
            totals.paintTouch += player.paintTouch || 0;
            
            // Calculate points
            const twoPoints = (player.fgm || 0) - (player.tpm || 0);
            totals.pts += twoPoints * 2 + (player.tpm || 0) * 3 + (player.ftm || 0);
        });
        
        // Calculate percentages
        const percentages = {
            fg: totals.fga > 0 ? (totals.fgm / totals.fga * 100).toFixed(1) : '0.0',
            tp: totals.tpa > 0 ? (totals.tpm / totals.tpa * 100).toFixed(1) : '0.0',
            ft: totals.fta > 0 ? (totals.ftm / totals.fta * 100).toFixed(1) : '0.0',
            // Calculate effective field goal percentage
            efg: totals.fga > 0 ? ((totals.fgm + 0.5 * totals.tpm) / totals.fga * 100).toFixed(1) : '0.0'
        };
        
        return {
            totals,
            percentages
        };
    },
    
    /**
     * Calculate advanced team statistics
     * @param {Object} teamStats - Team stats from calculateTeamStats
     * @param {Object} opponentStats - Opponent team stats
     * @param {Number} possessions - Number of possessions
     * @returns {Object} Advanced statistics
     */
    calculateAdvancedStats: function(teamStats, opponentStats, possessions) {
        const advanced = {};
        
        // Offensive rating (points per 100 possessions)
        advanced.ortg = possessions > 0 
            ? ((teamStats.totals.pts / possessions) * 100).toFixed(1) 
            : '0.0';
        
        // Defensive rating (opponent points per 100 possessions)
        advanced.drtg = possessions > 0 
            ? ((opponentStats.totals.pts / possessions) * 100).toFixed(1) 
            : '0.0';
        
        // Net rating
        advanced.netrtg = (parseFloat(advanced.ortg) - parseFloat(advanced.drtg)).toFixed(1);
        
        // Assist ratio (percentage of field goals that are assisted)
        advanced.astRatio = teamStats.totals.fgm > 0 
            ? ((teamStats.totals.ast / teamStats.totals.fgm) * 100).toFixed(1) 
            : '0.0';
        
        // Turnover ratio (turnovers per 100 possessions)
        advanced.tovRatio = possessions > 0 
            ? ((teamStats.totals.to / possessions) * 100).toFixed(1) 
            : '0.0';
        
        // Offensive rebounding percentage
        const totalOffRebOpportunities = teamStats.totals.oreb + opponentStats.totals.dreb;
        advanced.orebPct = totalOffRebOpportunities > 0 
            ? ((teamStats.totals.oreb / totalOffRebOpportunities) * 100).toFixed(1) 
            : '0.0';
        
        // Defensive rebounding percentage
        const totalDefRebOpportunities = teamStats.totals.dreb + opponentStats.totals.oreb;
        advanced.drebPct = totalDefRebOpportunities > 0 
            ? ((teamStats.totals.dreb / totalDefRebOpportunities) * 100).toFixed(1) 
            : '0.0';
        
        // Total rebounding percentage
        const totalRebounds = teamStats.totals.reb + opponentStats.totals.reb;
        advanced.rebPct = totalRebounds > 0 
            ? ((teamStats.totals.reb / totalRebounds) * 100).toFixed(1) 
            : '0.0';
        
        // Paint touch percentage
        advanced.paintPct = teamStats.totals.fga > 0 
            ? ((teamStats.totals.paintTouch / teamStats.totals.fga) * 100).toFixed(1) 
            : '0.0';
        
        return advanced;
    },
    
    /**
     * Estimate possessions based on box score stats
     * @param {Object} teamStats - Team stats object
     * @returns {Number} Estimated possessions
     */
    estimatePossessions: function(teamStats) {
        // Possession estimate formula:
        // Poss = FGA - ORB + TO + (0.44 * FTA)
        return teamStats.totals.fga - teamStats.totals.oreb + teamStats.totals.to + (0.44 * teamStats.totals.fta);
    },
    
    /**
     * Calculate individual player advanced stats
     * @param {Object} player - Player stats object
     * @param {Object} teamStats - Team stats
     * @param {Number} possessions - Player's minutes share of possessions
     * @returns {Object} Advanced player stats
     */
    calculatePlayerAdvancedStats: function(player, teamStats, possessions) {
        const advanced = {};
        
        // Calculate points
        const points = ((player.fgm - player.tpm) * 2) + (player.tpm * 3) + player.ftm;
        
        // Usage rate
        // USG% = (FGA + 0.44 * FTA + TO) * 100 / (Team FGA + 0.44 * Team FTA + Team TO)
        const teamUsageDenom = teamStats.totals.fga + 0.44 * teamStats.totals.fta + teamStats.totals.to;
        advanced.usg = teamUsageDenom > 0
            ? (((player.fga + 0.44 * player.fta + player.to) / teamUsageDenom) * 100).toFixed(1)
            : '0.0';
        
        // Player efficiency rating (simplified version)
        // PER = (PTS + REB + AST + STL + BLK - TO - (FGA - FGM) - (FTA - FTM)) / possessions * 100
        advanced.efficiency = possessions > 0
            ? (((points + player.oreb + player.dreb + player.ast + player.stl + player.blk - player.to - 
                (player.fga - player.fgm) - (player.fta - player.ftm)) / possessions) * 100).toFixed(1)
            : '0.0';
        
        // Assist to turnover ratio
        advanced.astToRatio = player.to > 0
            ? (player.ast / player.to).toFixed(1)
            : player.ast > 0 ? player.ast.toFixed(1) : '0.0';
        
        return advanced;
    },
    
    /**
     * Convert game data to CSV format
     * @param {Object} gameData - Complete game data
     * @returns {String} CSV content
     */
    exportToCSV: function(gameData) {
        // Create header rows
        let csv = 'Basketball Stat Tracker Export\n';
        csv += 'Game Date,' + (gameData.date || '') + '\n';
        csv += 'Location,' + (gameData.location || '') + '\n';
        csv += 'Home Team,' + gameData.homeTeam.name + ',' + gameData.homeTeam.score + '\n';
        csv += 'Away Team,' + gameData.awayTeam.name + ',' + gameData.awayTeam.score + '\n\n';
        
        // Home team player stats
        csv += 'HOME TEAM PLAYERS\n';
        csv += 'Number,Player,MIN,PTS,FGM,FGA,FG%,3PM,3PA,3P%,FTM,FTA,FT%,OREB,DREB,REB,AST,STL,BLK,TO,PF,+/-\n';
        
        gameData.homeTeam.players.forEach(player => {
            const fg = player.fga > 0 ? (player.fgm / player.fga * 100).toFixed(1) : '0.0';
            const tp = player.tpa > 0 ? (player.tpm / player.tpa * 100).toFixed(1) : '0.0';
            const ft = player.fta > 0 ? (player.ftm / player.fta * 100).toFixed(1) : '0.0';
            const pts = ((player.fgm - player.tpm) * 2) + (player.tpm * 3) + player.ftm;
            
            csv += `${player.number},${player.name},${player.minutes || 0},${pts},`;
            csv += `${player.fgm || 0},${player.fga || 0},${fg}%,`;
            csv += `${player.tpm || 0},${player.tpa || 0},${tp}%,`;
            csv += `${player.ftm || 0},${player.fta || 0},${ft}%,`;
            csv += `${player.oreb || 0},${player.dreb || 0},${(player.oreb || 0) + (player.dreb || 0)},`;
            csv += `${player.ast || 0},${player.stl || 0},${player.blk || 0},${player.to || 0},${player.pf || 0},${player.plusMinus || 0}\n`;
        });
        
        csv += '\n';
        
        // Away team player stats
        csv += 'AWAY TEAM PLAYERS\n';
        csv += 'Number,Player,MIN,PTS,FGM,FGA,FG%,3PM,3PA,3P%,FTM,FTA,FT%,OREB,DREB,REB,AST,STL,BLK,TO,PF,+/-\n';
        
        gameData.awayTeam.players.forEach(player => {
            const fg = player.fga > 0 ? (player.fgm / player.fga * 100).toFixed(1) : '0.0';
            const tp = player.tpa > 0 ? (player.tpm / player.tpa * 100).toFixed(1) : '0.0';
            const ft = player.fta > 0 ? (player.ftm / player.fta * 100).toFixed(1) : '0.0';
            const pts = ((player.fgm - player.tpm) * 2) + (player.tpm * 3) + player.ftm;
            
            csv += `${player.number},${player.name},${player.minutes || 0},${pts},`;
            csv += `${player.fgm || 0},${player.fga || 0},${fg}%,`;
            csv += `${player.tpm || 0},${player.tpa || 0},${tp}%,`;
            csv += `${player.ftm || 0},${player.fta || 0},${ft}%,`;
            csv += `${player.oreb || 0},${player.dreb || 0},${(player.oreb || 0) + (player.dreb || 0)},`;
            csv += `${player.ast || 0},${player.stl || 0},${player.blk || 0},${player.to || 0},${player.pf || 0},${player.plusMinus || 0}\n`;
        });
        
        csv += '\n';
        
        // Team comparison stats
        csv += 'TEAM COMPARISON\n';
        csv += 'Stat,' + gameData.homeTeam.name + ',' + gameData.awayTeam.name + '\n';
        
        const homeStats = this.calculateTeamStats(gameData.homeTeam.players);
        const awayStats = this.calculateTeamStats(gameData.awayTeam.players);
        
        csv += `Points,${homeStats.totals.pts},${awayStats.totals.pts}\n`;
        csv += `FG%,${homeStats.percentages.fg}%,${awayStats.percentages.fg}%\n`;
        csv += `3P%,${homeStats.percentages.tp}%,${awayStats.percentages.tp}%\n`;
        csv += `FT%,${homeStats.percentages.ft}%,${awayStats.percentages.ft}%\n`;
        csv += `Rebounds,${homeStats.totals.reb},${awayStats.totals.reb}\n`;
        csv += `Assists,${homeStats.totals.ast},${awayStats.totals.ast}\n`;
        csv += `Steals,${homeStats.totals.stl},${awayStats.totals.stl}\n`;
        csv += `Blocks,${homeStats.totals.blk},${awayStats.totals.blk}\n`;
        csv += `Turnovers,${homeStats.totals.to},${awayStats.totals.to}\n`;
        csv += `Paint Touches,${homeStats.totals.paintTouch},${awayStats.totals.paintTouch}\n`;
        
        return csv;
    }
};