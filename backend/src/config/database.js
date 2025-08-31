const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../utils/logger');

let db;

const initializeDatabase = () => {
    try {
        // Create database directory if it doesn't exist
        const dbDir = path.join(__dirname, '../../data');
        const fs = require('fs');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize database
        const dbPath = path.join(dbDir, 'team_dashboard.db');
        db = new Database(dbPath);

        // Enable foreign keys
        db.pragma('foreign_keys = ON');

        // Create tables
        createTables();

        // Insert initial data
        insertInitialData();

        logger.info('Database initialized successfully');
        return db;
    } catch (error) {
        logger.error('Failed to initialize database:', error);
        throw error;
    }
};

const createTables = () => {
    // Users table for team members
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            role VARCHAR(50) DEFAULT 'qa_engineer',
            avatar_url TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Projects table
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            repository_url TEXT,
            framework VARCHAR(50),
            environment VARCHAR(50),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Test Reports table (centralized)
    db.exec(`
        CREATE TABLE IF NOT EXISTS test_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_name VARCHAR(255) NOT NULL,
            test_suite VARCHAR(255),
            status VARCHAR(20) NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'blocked')),
            execution_time INTEGER,
            start_time DATETIME,
            end_time DATETIME,
            error_message TEXT,
            stack_trace TEXT,
            screenshot_url TEXT,
            video_url TEXT,
            logs TEXT,
            metadata TEXT,
            tags TEXT,
            framework VARCHAR(50),
            browser VARCHAR(50),
            device VARCHAR(50),
            os VARCHAR(50),
            resolution VARCHAR(50),
            project_id INTEGER,
            team_member_id INTEGER,
            branch VARCHAR(100),
            commit_hash VARCHAR(100),
            environment VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (team_member_id) REFERENCES users(id)
        )
    `);

    // Test Suites table
    db.exec(`
        CREATE TABLE IF NOT EXISTS test_suites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            project_id INTEGER,
            framework VARCHAR(50),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    `);

    // Test Executions table for tracking test runs
    db.exec(`
        CREATE TABLE IF NOT EXISTS test_executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            execution_id VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255),
            status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
            total_tests INTEGER DEFAULT 0,
            passed_tests INTEGER DEFAULT 0,
            failed_tests INTEGER DEFAULT 0,
            skipped_tests INTEGER DEFAULT 0,
            blocked_tests INTEGER DEFAULT 0,
            start_time DATETIME,
            end_time DATETIME,
            duration INTEGER,
            triggered_by INTEGER,
            project_id INTEGER,
            environment VARCHAR(50),
            branch VARCHAR(100),
            commit_hash VARCHAR(100),
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (triggered_by) REFERENCES users(id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    `);

    // Test Results table linking executions to individual tests
    db.exec(`
        CREATE TABLE IF NOT EXISTS test_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            execution_id INTEGER NOT NULL,
            test_report_id INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL,
            execution_order INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (execution_id) REFERENCES test_executions(id),
            FOREIGN KEY (test_report_id) REFERENCES test_reports(id)
        )
    `);

    // Team Performance Metrics table
    db.exec(`
        CREATE TABLE IF NOT EXISTS team_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
            date DATE NOT NULL,
            total_tests INTEGER DEFAULT 0,
            passed_tests INTEGER DEFAULT 0,
            failed_tests INTEGER DEFAULT 0,
            skipped_tests INTEGER DEFAULT 0,
            blocked_tests INTEGER DEFAULT 0,
            total_execution_time INTEGER DEFAULT 0,
            avg_execution_time INTEGER DEFAULT 0,
            success_rate DECIMAL(5,2) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (project_id) REFERENCES projects(id),
            UNIQUE(user_id, project_id, date)
        )
    `);

    // Notifications table for team alerts
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_test_reports_status ON test_reports(status);
        CREATE INDEX IF NOT EXISTS idx_test_reports_project ON test_reports(project_id);
        CREATE INDEX IF NOT EXISTS idx_test_reports_member ON test_reports(team_member_id);
        CREATE INDEX IF NOT EXISTS idx_test_reports_created ON test_reports(created_at);
        CREATE INDEX IF NOT EXISTS idx_test_reports_framework ON test_reports(framework);
        CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
        CREATE INDEX IF NOT EXISTS idx_test_executions_project ON test_executions(project_id);
        CREATE INDEX IF NOT EXISTS idx_team_performance_user_date ON team_performance(user_id, date);
    `);

    logger.info('Database tables created successfully');
};

const insertInitialData = () => {
    try {
        // Insert default users if table is empty
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        if (userCount.count === 0) {
            const insertUser = db.prepare(`
                INSERT INTO users (username, email, full_name, role) 
                VALUES (?, ?, ?, ?)
            `);

            insertUser.run('admin', 'admin@team.com', 'System Administrator', 'admin');
            insertUser.run('qa_lead', 'qa_lead@team.com', 'QA Team Lead', 'qa_lead');
            insertUser.run('qa_engineer1', 'qa1@team.com', 'QA Engineer 1', 'qa_engineer');
            insertUser.run('qa_engineer2', 'qa2@team.com', 'QA Engineer 2', 'qa_engineer');

            logger.info('Default users inserted');
        }

        // Insert default projects if table is empty
        const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
        if (projectCount.count === 0) {
            const insertProject = db.prepare(`
                INSERT INTO projects (name, description, framework, environment) 
                VALUES (?, ?, ?, ?)
            `);

            insertProject.run('Web Application', 'Main web application testing', 'Playwright', 'staging');
            insertProject.run('Mobile App', 'Mobile application testing', 'Appium', 'staging');
            insertProject.run('API Testing', 'REST API testing', 'Postman', 'staging');

            logger.info('Default projects inserted');
        }

        // Insert sample test reports if table is empty
        const testReportCount = db.prepare('SELECT COUNT(*) as count FROM test_reports').get();
        if (testReportCount.count === 0) {
            const insertTestReport = db.prepare(`
                INSERT INTO test_reports (
                    test_name, test_suite, status, execution_time, framework, 
                    browser, project_id, team_member_id, environment
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const now = new Date().toISOString();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // Sample test reports
            insertTestReport.run('Login Test', 'Authentication Suite', 'passed', 15, 'Playwright', 'Chrome', 1, 3, 'staging');
            insertTestReport.run('User Registration', 'Authentication Suite', 'passed', 12, 'Playwright', 'Chrome', 1, 3, 'staging');
            insertTestReport.run('Search Functionality', 'Search Suite', 'failed', 8, 'Playwright', 'Chrome', 1, 4, 'staging');
            insertTestReport.run('API Health Check', 'API Suite', 'passed', 3, 'Postman', 'N/A', 3, 3, 'staging');
            insertTestReport.run('Mobile Login', 'Mobile Auth', 'skipped', 0, 'Appium', 'iOS', 2, 4, 'staging');

            logger.info('Sample test reports inserted');
        }

    } catch (error) {
        logger.error('Error inserting initial data:', error);
    }
};

const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
};

const query = (sql, params = []) => {
    const db = getDatabase();
    return db.prepare(sql);
};

const closeDatabase = () => {
    if (db) {
        db.close();
        logger.info('Database connection closed');
    }
};

module.exports = {
    initializeDatabase,
    getDatabase,
    query,
    closeDatabase
};
