const express = require('express');
const { getDatabase } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get all users (QA team members)
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        const users = db.prepare(`
            SELECT id, username, email, fullName, role, isActive, createdAt
            FROM users 
            ORDER BY fullName
        `).all();

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Get user by username
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const db = getDatabase();
        
        const user = db.prepare(`
            SELECT id, username, email, fullName, role, isActive, createdAt
            FROM users 
            WHERE username = ?
        `).get(username);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        logger.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

// Create new user
router.post('/', async (req, res) => {
    try {
        const { username, email, fullName, role = 'qa' } = req.body;
        const db = getDatabase();

        // Check if user already exists
        const existingUser = db.prepare(`
            SELECT id FROM users WHERE username = ? OR email = ?
        `).get(username, email);

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }

        // Insert new user
        const result = db.prepare(`
            INSERT INTO users (username, email, fullName, role)
            VALUES (?, ?, ?, ?)
        `).run(username, email, fullName, role);

        // Add to default team
        db.prepare(`
            INSERT INTO team_members (teamId, userId)
            VALUES (1, ?)
        `).run(result.lastInsertRowid);

        logger.info(`New user created: ${username}`);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { id: result.lastInsertRowid, username, email, fullName, role }
        });
    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// Update user
router.put('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { email, fullName, role, isActive } = req.body;
        const db = getDatabase();

        const result = db.prepare(`
            UPDATE users 
            SET email = ?, fullName = ?, role = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE username = ?
        `).run(email, fullName, role, isActive, username);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        logger.info(`User updated: ${username}`);
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

// Delete user
router.delete('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const db = getDatabase();

        const result = db.prepare(`
            DELETE FROM users WHERE username = ?
        `).run(username);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        logger.info(`User deleted: ${username}`);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

// Get user statistics
router.get('/:username/stats', async (req, res) => {
    try {
        const { username } = req.params;
        const { days = 30 } = req.query;
        const db = getDatabase();

        // Get user ID
        const user = db.prepare(`
            SELECT id FROM users WHERE username = ?
        `).get(username);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get user statistics
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as totalExecutions,
                SUM(totalTests) as totalTests,
                SUM(passedTests) as totalPassed,
                SUM(failedTests) as totalFailed,
                AVG(totalDuration) as avgDuration,
                ROUND((SUM(passedTests) * 100.0 / SUM(totalTests)), 2) as passRate,
                MIN(createdAt) as firstExecution,
                MAX(createdAt) as lastExecution
            FROM test_reports 
            WHERE executedBy = ? AND createdAt >= datetime('now', '-${days} days')
        `).get(user.id);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error fetching user stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user statistics' });
    }
});

module.exports = router;
