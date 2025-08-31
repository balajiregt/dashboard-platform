const { logger } = require('../utils/logger');
const storageService = require('../services/storageService');

/**
 * Get consolidated results from all QA team members
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTeamResults = async (req, res) => {
    try {
        const { startDate, endDate, projectId, members, status } = req.query;

        // Get results from storage service
        const results = await storageService.getTestResults({
            startDate,
            endDate,
            project: projectId,
            status,
            teamMember: members
        });

        // Calculate team summary
        const summary = calculateTeamSummary(results);

        res.json({
            success: true,
            data: {
                results,
                summary,
                filters: {
                    startDate,
                    endDate,
                    projectId,
                    members,
                    status
                },
                totalCount: results.length
            }
        });

    } catch (error) {
        logger.error('Error fetching team results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team results'
        });
    }
};

/**
 * Get team-wide analytics and trends
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTeamAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;

        // Get analytics data
        const analytics = await generateTeamAnalytics(startDate, endDate, projectId);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        logger.error('Error fetching team analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team analytics'
        });
    }
};

/**
 * Get team performance metrics and comparisons
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTeamPerformance = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;

        // Get performance metrics
        const performance = await generateTeamPerformance(startDate, endDate, projectId);

        res.json({
            success: true,
            data: performance
        });

    } catch (error) {
        logger.error('Error fetching team performance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team performance'
        });
    }
};

/**
 * Calculate team summary statistics
 * @param {Array} results - Array of test results
 * @returns {Object} Summary statistics
 */
const calculateTeamSummary = (results) => {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const blocked = results.filter(r => r.status === 'blocked').length;

    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    const failureRate = total > 0 ? ((failed / total) * 100).toFixed(2) : 0;

    // Calculate average execution time
    const executionTimes = results
        .filter(r => r.execution_time)
        .map(r => r.execution_time);

    const avgExecutionTime = executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;

    // Get unique team members
    const teamMembers = [...new Set(results.map(r => r.team_member_id))];

    // Get unique projects
    const projects = [...new Set(results.map(r => r.project_id))];

    // Get unique frameworks
    const frameworks = [...new Set(results.map(r => r.framework))];

    return {
        total,
        passed,
        failed,
        skipped,
        blocked,
        successRate: parseFloat(successRate),
        failureRate: parseFloat(failureRate),
        avgExecutionTime: Math.round(avgExecutionTime),
        teamMemberCount: teamMembers.length,
        projectCount: projects.length,
        frameworkCount: frameworks.length,
        frameworks,
        lastUpdated: results.length > 0 ? results[0].created_at : null
    };
};

/**
 * Generate team analytics data
 * @param {string} startDate - Start date filter
 * @param {string} endDate - End date filter
 * @param {string} projectId - Project filter
 * @returns {Object} Analytics data
 */
const generateTeamAnalytics = async (startDate, endDate, projectId) => {
    try {
        // Get daily trends
        const dailyTrends = await getDailyTrends(startDate, endDate, projectId);

        // Get status distribution over time
        const statusTrends = await getStatusTrends(startDate, endDate, projectId);

        // Get team member performance comparison
        const memberPerformance = await getMemberPerformance(startDate, endDate, projectId);

        // Get project-wise analytics
        const projectAnalytics = await getProjectAnalytics(startDate, endDate);

        return {
            dailyTrends,
            statusTrends,
            memberPerformance,
            projectAnalytics
        };
    } catch (error) {
        logger.error('Error generating team analytics:', error);
        throw error;
    }
};

/**
 * Generate team performance metrics
 * @param {string} startDate - Start date filter
 * @param {string} endDate - End date filter
 * @param {string} projectId - Project filter
 * @returns {Object} Performance metrics
 */
const generateTeamPerformance = async (startDate, endDate, projectId) => {
    try {
        // Get velocity metrics
        const velocity = await getVelocityMetrics(startDate, endDate, projectId);

        // Get quality metrics
        const quality = await getQualityMetrics(startDate, endDate, projectId);

        // Get efficiency metrics
        const efficiency = await getEfficiencyMetrics(startDate, endDate, projectId);

        return {
            velocity,
            quality,
            efficiency
        };
    } catch (error) {
        logger.error('Error generating team performance:', error);
        throw error;
    }
};

// Helper functions for analytics and performance
const getDailyTrends = async (startDate, endDate, projectId) => {
    // Implementation for daily trends
    return [];
};

const getStatusTrends = async (startDate, endDate, projectId) => {
    // Implementation for status trends
    return [];
};

const getMemberPerformance = async (startDate, endDate, projectId) => {
    // Implementation for member performance
    return [];
};

const getProjectAnalytics = async (startDate, endDate) => {
    // Implementation for project analytics
    return [];
};

const getVelocityMetrics = async (startDate, endDate, projectId) => {
    // Implementation for velocity metrics
    return {};
};

const getQualityMetrics = async (startDate, endDate, projectId) => {
    // Implementation for quality metrics
    return {};
};

const getEfficiencyMetrics = async (startDate, endDate, projectId) => {
    // Implementation for efficiency metrics
    return {};
};

module.exports = {
    getTeamResults,
    getTeamAnalytics,
    getTeamPerformance
};
