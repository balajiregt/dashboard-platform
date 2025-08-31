const express = require('express');
const TestReport = require('../models/TestReport');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get all test reports with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            projectId,
            branch,
            status,
            environment,
            browser,
            executionType,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filters
        const filters = {};
        if (projectId) filters.projectId = projectId;
        if (branch) filters.branch = branch;
        if (environment) filters.environment = environment;
        if (browser) filters.browser = browser;
        if (executionType) filters.executionType = executionType;

        // Status filter
        if (status) {
            if (status === 'passed') {
                filters.failedTests = 0;
                filters.skippedTests = 0;
            } else if (status === 'failed') {
                filters.failedTests = { $gt: 0 };
            } else if (status === 'partial') {
                filters.failedTests = { $gt: 0 };
                filters.passedTests = { $gt: 0 };
            }
        }

        // Date range filter
        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) filters.createdAt.$gte = new Date(startDate);
            if (endDate) filters.createdAt.$lte = new Date(endDate);
        }

        // Build sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const testReports = await TestReport.find(filters)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-testResults')
            .lean();

        // Get total count for pagination
        const total = await TestReport.countDocuments(filters);

        res.json({
            success: true,
            data: {
                testReports,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        logger.error('Failed to get test reports:', error);
        res.status(500).json({
            error: 'Failed to get test reports',
            message: error.message
        });
    }
});

// Get specific test report by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const testReport = await TestReport.findById(id);
        if (!testReport) {
            return res.status(404).json({ error: 'Test report not found' });
        }

        res.json({
            success: true,
            data: testReport
        });

    } catch (error) {
        logger.error('Failed to get test report:', error);
        res.status(500).json({
            error: 'Failed to get test report',
            message: error.message
        });
    }
});

// Update test report
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData.executionId;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        const testReport = await TestReport.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!testReport) {
            return res.status(404).json({ error: 'Test report not found' });
        }

        res.json({
            success: true,
            data: testReport
        });

    } catch (error) {
        logger.error('Failed to update test report:', error);
        res.status(500).json({
            error: 'Failed to update test report',
            message: error.message
        });
    }
});

// Delete test report
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const testReport = await TestReport.findByIdAndDelete(id);
        if (!testReport) {
            return res.status(404).json({ error: 'Test report not found' });
        }

        res.json({
            success: true,
            message: 'Test report deleted successfully'
        });

    } catch (error) {
        logger.error('Failed to delete test report:', error);
        res.status(500).json({
            error: 'Failed to delete test report',
            message: error.message
        });
    }
});

// Get test report statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const { projectId, days = 30 } = req.query;

        const filters = {};
        if (projectId) filters.projectId = projectId;

        // Date filter
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        filters.createdAt = { $gte: daysAgo };

        const stats = await TestReport.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: null,
                    totalExecutions: { $sum: 1 },
                    totalTests: { $sum: '$totalTests' },
                    totalPassed: { $sum: '$passedTests' },
                    totalFailed: { $sum: '$failedTests' },
                    totalSkipped: { $sum: '$skippedTests' },
                    totalDuration: { $sum: '$totalDuration' },
                    averagePassPercentage: { $avg: '$passPercentage' },
                    averageDuration: { $avg: '$totalDuration' }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0] || {
                totalExecutions: 0,
                totalTests: 0,
                totalPassed: 0,
                totalFailed: 0,
                totalSkipped: 0,
                totalDuration: 0,
                averagePassPercentage: 0,
                averageDuration: 0
            }
        });

    } catch (error) {
        logger.error('Failed to get test report statistics:', error);
        res.status(500).json({
            error: 'Failed to get test report statistics',
            message: error.message
        });
    }
});

module.exports = router;
