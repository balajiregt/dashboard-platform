const express = require('express');
const TestReport = require('../models/TestReport');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
    try {
        const projects = await TestReport.aggregate([
            {
                $group: {
                    _id: '$projectId',
                    projectName: { $first: '$projectName' },
                    totalExecutions: { $sum: 1 },
                    lastExecution: { $max: '$createdAt' },
                    averagePassPercentage: { $avg: '$passPercentage' },
                    totalTests: { $sum: '$totalTests' },
                    totalDuration: { $sum: '$totalDuration' }
                }
            },
            {
                $project: {
                    projectId: '$_id',
                    projectName: 1,
                    totalExecutions: 1,
                    lastExecution: 1,
                    averagePassPercentage: { $round: ['$averagePassPercentage', 2] },
                    totalTests: 1,
                    totalDuration: 1,
                    averageDuration: { $round: [{ $divide: ['$totalDuration', '$totalExecutions'] }, 2] }
                }
            },
            { $sort: { lastExecution: -1 } }
        ]);

        res.json({
            success: true,
            data: projects
        });

    } catch (error) {
        logger.error('Failed to get projects:', error);
        res.status(500).json({
            error: 'Failed to get projects',
            message: error.message
        });
    }
});

// Get project details
router.get('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { days = 30 } = req.query;

        // Date filter
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        const projectDetails = await TestReport.aggregate([
            { $match: { projectId, createdAt: { $gte: daysAgo } } },
            {
                $group: {
                    _id: null,
                    projectId: { $first: '$projectId' },
                    projectName: { $first: '$projectName' },
                    totalExecutions: { $sum: 1 },
                    totalTests: { $sum: '$totalTests' },
                    totalPassed: { $sum: '$passedTests' },
                    totalFailed: { $sum: '$failedTests' },
                    totalSkipped: { $sum: '$skippedTests' },
                    totalDuration: { $sum: '$totalDuration' },
                    averagePassPercentage: { $avg: '$passPercentage' },
                    averageDuration: { $avg: '$totalDuration' },
                    lastExecution: { $max: '$createdAt' },
                    firstExecution: { $min: '$createdAt' }
                }
            }
        ]);

        if (projectDetails.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get recent executions
        const recentExecutions = await TestReport.find({ projectId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('executionId createdAt totalTests passedTests failedTests totalDuration passPercentage')
            .lean();

        // Get branch statistics
        const branchStats = await TestReport.aggregate([
            { $match: { projectId, createdAt: { $gte: daysAgo } } },
            {
                $group: {
                    _id: '$branch',
                    executions: { $sum: 1 },
                    averagePassPercentage: { $avg: '$passPercentage' },
                    totalTests: { $sum: '$totalTests' }
                }
            },
            { $sort: { executions: -1 } }
        ]);

        // Get environment statistics
        const environmentStats = await TestReport.aggregate([
            { $match: { projectId, createdAt: { $gte: daysAgo } } },
            {
                $group: {
                    _id: '$environment',
                    executions: { $sum: 1 },
                    averagePassPercentage: { $avg: '$passPercentage' },
                    totalTests: { $sum: '$totalTests' }
                }
            },
            { $sort: { executions: -1 } }
        ]);

        const projectData = {
            ...projectDetails[0],
            recentExecutions,
            branchStats,
            environmentStats,
            timeRange: {
                days: parseInt(days),
                startDate: daysAgo.toISOString(),
                endDate: new Date().toISOString()
            }
        };

        res.json({
            success: true,
            data: projectData
        });

    } catch (error) {
        logger.error('Failed to get project details:', error);
        res.status(500).json({
            error: 'Failed to get project details',
            message: error.message
        });
    }
});

// Get project trends
router.get('/:projectId/trends', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { days = 30, interval = 'day' } = req.query;

        // Date filter
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        let dateFormat;
        if (interval === 'hour') {
            dateFormat = '%Y-%m-%d-%H';
        } else if (interval === 'day') {
            dateFormat = '%Y-%m-%d';
        } else if (interval === 'week') {
            dateFormat = '%Y-%U';
        } else if (interval === 'month') {
            dateFormat = '%Y-%m';
        }

        const trends = await TestReport.aggregate([
            { $match: { projectId, createdAt: { $gte: daysAgo } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: dateFormat, date: '$createdAt' } }
                    },
                    executions: { $sum: 1 },
                    tests: { $sum: '$totalTests' },
                    passed: { $sum: '$passedTests' },
                    failed: { $sum: '$failedTests' },
                    skipped: { $sum: '$skippedTests' },
                    passPercentage: { $avg: '$passPercentage' },
                    duration: { $avg: '$totalDuration' }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        res.json({
            success: true,
            data: trends
        });

    } catch (error) {
        logger.error('Failed to get project trends:', error);
        res.status(500).json({
            error: 'Failed to get project trends',
            message: error.message
        });
    }
});

module.exports = router;
