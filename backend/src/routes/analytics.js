const express = require('express');
const { getDatabase } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get overall dashboard metrics with team insights
router.get('/dashboard', async (req, res) => {
    try {
        const { projectId, days = 30, environment, branch, teamId } = req.query;
        const db = getDatabase();
        
        // Build filters
        let filters = '';
        let params = [];
        
        if (projectId) {
            filters += ' AND tr.projectId = ?';
            params.push(projectId);
        }
        
        if (days) {
            filters += ' AND tr.createdAt >= datetime("now", "-' + days + ' days")';
        }
        
        if (environment) {
            filters += ' AND tr.environment = ?';
            params.push(environment);
        }
        
        if (branch) {
            filters += ' AND tr.branch = ?';
            params.push(branch);
        }

        // Overall statistics
        const overallStats = db.prepare(`
            SELECT 
                COUNT(*) as totalExecutions,
                SUM(tr.totalTests) as totalTests,
                SUM(tr.passedTests) as totalPassed,
                SUM(tr.failedTests) as totalFailed,
                SUM(tr.skippedTests) as totalSkipped,
                SUM(tr.flakyTests) as totalFlaky,
                AVG(tr.totalDuration) as avgDuration,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as overallPassRate
            FROM test_reports tr
            WHERE 1=1 ${filters}
        `).get(params);

        // Team performance comparison
        const teamPerformance = db.prepare(`
            SELECT 
                u.fullName as qaMember,
                u.username,
                COUNT(tr.id) as totalExecutions,
                SUM(tr.totalTests) as totalTests,
                SUM(tr.passedTests) as totalPassed,
                SUM(tr.failedTests) as totalFailed,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as passRate,
                AVG(tr.totalDuration) as avgDuration,
                MAX(tr.createdAt) as lastExecution
            FROM test_reports tr
            JOIN users u ON tr.executedBy = u.id
            WHERE 1=1 ${filters}
            GROUP BY u.id, u.fullName, u.username
            ORDER BY totalExecutions DESC
        `).all(params);

        // Recent executions by team members
        const recentExecutions = db.prepare(`
            SELECT 
                tr.executionId,
                tr.projectName,
                tr.branch,
                tr.totalTests,
                tr.passedTests,
                tr.failedTests,
                tr.totalDuration,
                tr.createdAt,
                u.fullName as executedBy,
                u.username
            FROM test_reports tr
            JOIN users u ON tr.executedBy = u.id
            WHERE 1=1 ${filters}
            ORDER BY tr.createdAt DESC
            LIMIT 10
        `).all(params);

        // Failure patterns by team member
        const failurePatterns = db.prepare(`
            SELECT 
                u.fullName as qaMember,
                tr.testName,
                COUNT(*) as failureCount,
                AVG(tr.duration) as avgDuration,
                MAX(tr.createdAt) as lastFailure
            FROM test_results tr
            JOIN test_reports tr_main ON tr.executionId = tr_main.executionId
            JOIN users u ON tr_main.executedBy = u.id
            WHERE tr.status = 'failed' ${filters.replace(/tr\./g, 'tr_main.')}
            GROUP BY u.fullName, tr.testName
            HAVING failureCount > 1
            ORDER BY failureCount DESC
            LIMIT 20
        `).all(params);

        // Daily trend data
        const trendData = db.prepare(`
            SELECT 
                DATE(tr.createdAt) as date,
                COUNT(*) as executions,
                SUM(tr.totalTests) as totalTests,
                SUM(tr.passedTests) as passedTests,
                SUM(tr.failedTests) as failedTests,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as passRate
            FROM test_reports tr
            WHERE 1=1 ${filters}
            GROUP BY DATE(tr.createdAt)
            ORDER BY date DESC
            LIMIT 30
        `).all(params);

        res.json({
            success: true,
            data: {
                overall: overallStats,
                teamPerformance,
                recentExecutions,
                failurePatterns,
                trends: trendData
            }
        });
    } catch (error) {
        logger.error('Dashboard analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
});

// Get individual QA member performance
router.get('/member/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { days = 30, projectId } = req.query;
        const db = getDatabase();

        // Get user details
        const user = db.prepare(`
            SELECT id, username, fullName, email, role, createdAt
            FROM users WHERE username = ?
        `).get(username);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Build filters
        let filters = 'AND tr.executedBy = ?';
        let params = [user.id];
        
        if (days) {
            filters += ' AND tr.createdAt >= datetime("now", "-' + days + ' days")';
        }
        
        if (projectId) {
            filters += ' AND tr.projectId = ?';
            params.push(projectId);
        }

        // Member statistics
        const memberStats = db.prepare(`
            SELECT 
                COUNT(*) as totalExecutions,
                SUM(tr.totalTests) as totalTests,
                SUM(tr.passedTests) as totalPassed,
                SUM(tr.failedTests) as totalFailed,
                SUM(tr.skippedTests) as totalSkipped,
                SUM(tr.flakyTests) as totalFlaky,
                AVG(tr.totalDuration) as avgDuration,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as passRate,
                MIN(tr.createdAt) as firstExecution,
                MAX(tr.createdAt) as lastExecution
            FROM test_reports tr
            WHERE 1=1 ${filters}
        `).get(params);

        // Recent executions
        const recentExecutions = db.prepare(`
            SELECT 
                tr.executionId,
                tr.projectName,
                tr.branch,
                tr.environment,
                tr.browser,
                tr.totalTests,
                tr.passedTests,
                tr.failedTests,
                tr.totalDuration,
                tr.createdAt
            FROM test_reports tr
            WHERE 1=1 ${filters}
            ORDER BY tr.createdAt DESC
            LIMIT 20
        `).all(params);

        // Project breakdown
        const projectBreakdown = db.prepare(`
            SELECT 
                tr.projectName,
                COUNT(*) as executions,
                SUM(tr.totalTests) as totalTests,
                SUM(tr.passedTests) as passedTests,
                SUM(tr.failedTests) as failedTests,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as passRate
            FROM test_reports tr
            WHERE 1=1 ${filters}
            GROUP BY tr.projectName
            ORDER BY executions DESC
        `).all(params);

        // Daily performance trend
        const dailyTrend = db.prepare(`
            SELECT 
                DATE(tr.createdAt) as date,
                COUNT(*) as executions,
                SUM(tr.totalTests) as totalTests,
                SUM(tr.passedTests) as passedTests,
                SUM(tr.failedTests) as failedTests,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as passRate
            FROM test_reports tr
            WHERE 1=1 ${filters}
            GROUP BY DATE(tr.createdAt)
            ORDER BY date DESC
            LIMIT 30
        `).all(params);

        res.json({
            success: true,
            data: {
                user,
                stats: memberStats,
                recentExecutions,
                projectBreakdown,
                dailyTrend
            }
        });
    } catch (error) {
        logger.error('Member analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch member data' });
    }
});

// Get team comparison
router.get('/team-comparison', async (req, res) => {
    try {
        const { days = 30, projectId } = req.query;
        const db = getDatabase();

        // Build filters
        let filters = '';
        let params = [];
        
        if (days) {
            filters += ' AND tr.createdAt >= datetime("now", "-' + days + ' days")';
        }
        
        if (projectId) {
            filters += ' AND tr.projectId = ?';
            params.push(projectId);
        }

        // Team member comparison
        const teamComparison = db.prepare(`
            SELECT 
                u.fullName,
                u.username,
                COUNT(tr.id) as executions,
                SUM(tr.totalTests) as totalTests,
                SUM(tr.passedTests) as passedTests,
                SUM(tr.failedTests) as failedTests,
                SUM(tr.skippedTests) as skippedTests,
                SUM(tr.flakyTests) as flakyTests,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as passRate,
                AVG(tr.totalDuration) as avgDuration,
                SUM(tr.totalDuration) as totalDuration,
                MAX(tr.createdAt) as lastExecution
            FROM test_reports tr
            JOIN users u ON tr.executedBy = u.id
            WHERE 1=1 ${filters}
            GROUP BY u.id, u.fullName, u.username
            ORDER BY executions DESC
        `).all(params);

        // Team efficiency metrics
        const teamEfficiency = db.prepare(`
            SELECT 
                COUNT(DISTINCT tr.executedBy) as activeMembers,
                COUNT(tr.id) as totalExecutions,
                SUM(tr.totalTests) as totalTests,
                ROUND((SUM(tr.passedTests) * 100.0 / SUM(tr.totalTests)), 2) as teamPassRate,
                AVG(tr.totalDuration) as avgExecutionTime,
                SUM(tr.totalDuration) as totalTimeSpent
            FROM test_reports tr
            WHERE 1=1 ${filters}
        `).get(params);

        res.json({
            success: true,
            data: {
                teamComparison,
                teamEfficiency
            }
        });
    } catch (error) {
        logger.error('Team comparison error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch team comparison data' });
    }
});

// Get failure analysis by team
router.get('/failures', async (req, res) => {
    try {
        const { days = 30, projectId, qaMember } = req.query;
        const db = getDatabase();

        // Build filters
        let filters = 'AND tr.status = "failed"';
        let params = [];
        
        if (days) {
            filters += ' AND tr_main.createdAt >= datetime("now", "-' + days + ' days")';
        }
        
        if (projectId) {
            filters += ' AND tr_main.projectId = ?';
            params.push(projectId);
        }

        if (qaMember) {
            filters += ' AND u.username = ?';
            params.push(qaMember);
        }

        // Top failing tests
        const topFailingTests = db.prepare(`
            SELECT 
                tr.testName,
                COUNT(*) as failureCount,
                AVG(tr.duration) as avgDuration,
                MAX(tr_main.createdAt) as lastFailure,
                u.fullName as lastExecutedBy
            FROM test_results tr
            JOIN test_reports tr_main ON tr.executionId = tr_main.executionId
            JOIN users u ON tr_main.executedBy = u.id
            WHERE 1=1 ${filters}
            GROUP BY tr.testName
            ORDER BY failureCount DESC
            LIMIT 20
        `).all(params);

        // Failure patterns by QA member
        const failuresByMember = db.prepare(`
            SELECT 
                u.fullName,
                u.username,
                COUNT(*) as totalFailures,
                COUNT(DISTINCT tr.testName) as uniqueFailingTests,
                AVG(tr.duration) as avgFailureDuration
            FROM test_results tr
            JOIN test_reports tr_main ON tr.executionId = tr_main.executionId
            JOIN users u ON tr_main.executedBy = u.id
            WHERE tr.status = 'failed' ${filters.replace(/tr\.status = "failed" AND/, '')}
            GROUP BY u.id, u.fullName, u.username
            ORDER BY totalFailures DESC
        `).all(params);

        res.json({
            success: true,
            data: {
                topFailingTests,
                failuresByMember
            }
        });
    } catch (error) {
        logger.error('Failure analysis error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch failure data' });
    }
});

module.exports = router;
