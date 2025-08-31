const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.folderId = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Load credentials from environment or file
            const credentials = this.loadCredentials();

            // Create OAuth2 client
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive']
            });

            this.drive = google.drive({ version: 'v3', auth });

            // Get or create the QA Dashboard folder
            this.folderId = await this.getOrCreateQAFolder();

            logger.info('Google Drive service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Google Drive service:', error);
            throw error;
        }
    }

    loadCredentials() {
        // Try to load from environment variable first
        if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
            return JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
        }

        // Try to load from credentials file
        const credentialsPath = path.join(__dirname, '../../credentials/google-drive-credentials.json');
        if (fs.existsSync(credentialsPath)) {
            return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        }

        throw new Error('Google Drive credentials not found. Please set GOOGLE_DRIVE_CREDENTIALS environment variable or create credentials file.');
    }

    async getOrCreateQAFolder() {
        try {
            // Search for existing QA Dashboard folder
            const response = await this.drive.files.list({
                q: "name='QA Dashboard' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields: 'files(id, name)'
            });

            if (response.data.files.length > 0) {
                logger.info('Using existing QA Dashboard folder');
                return response.data.files[0].id;
            }

            // Create new QA Dashboard folder
            const folderMetadata = {
                name: 'QA Dashboard',
                mimeType: 'application/vnd.google-apps.folder',
                description: 'Centralized QA test results and analytics'
            };

            const folder = await this.drive.files.create({
                resource: folderMetadata,
                fields: 'id'
            });

            logger.info('Created new QA Dashboard folder');
            return folder.data.id;
        } catch (error) {
            logger.error('Failed to get or create QA folder:', error);
            throw error;
        }
    }

    // Store test results in Google Drive
    async storeTestResult(testData) {
        try {
            const fileName = `test-result-${Date.now()}-${testData.test_name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;

            // Create file metadata
            const fileMetadata = {
                name: fileName,
                parents: [this.folderId],
                description: `Test result for ${testData.test_name} executed by ${testData.team_member_name}`,
                properties: {
                    testName: testData.test_name,
                    status: testData.status,
                    teamMember: testData.team_member_name,
                    project: testData.project_name,
                    framework: testData.framework,
                    timestamp: new Date().toISOString()
                }
            };

            // Convert test data to JSON
            const media = {
                mimeType: 'application/json',
                body: JSON.stringify(testData, null, 2)
            };

            // Upload file to Google Drive
            const file = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name, createdTime, properties'
            });

            logger.info(`Test result stored in Google Drive: ${file.data.name}`);
            return {
                fileId: file.data.id,
                fileName: file.data.name,
                createdTime: file.data.createdTime
            };
        } catch (error) {
            logger.error('Failed to store test result:', error);
            throw error;
        }
    }

    // Retrieve test results from Google Drive
    async getTestResults(filters = {}) {
        try {
            let query = `'${this.folderId}' in parents and trashed=false and mimeType='application/json'`;

            // Add filters if provided
            if (filters.startDate) {
                query += ` and createdTime >= '${filters.startDate}'`;
            }
            if (filters.endDate) {
                query += ` and createdTime <= '${filters.endDate}'`;
            }
            if (filters.status) {
                query += ` and properties has { key='status' and value='${filters.status}' }`;
            }
            if (filters.teamMember) {
                query += ` and properties has { key='teamMember' and value='${filters.teamMember}' }`;
            }
            if (filters.project) {
                query += ` and properties has { key='project' and value='${filters.project}' }`;
            }

            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id, name, createdTime, properties, size)',
                orderBy: 'createdTime desc',
                pageSize: 1000
            });

            const results = [];

            // Process each file to extract test data
            for (const file of response.data.files) {
                try {
                    const fileContent = await this.drive.files.get({
                        fileId: file.id,
                        alt: 'media'
                    });

                    const testData = JSON.parse(fileContent.data);
                    results.push({
                        ...testData,
                        fileId: file.id,
                        fileName: file.name,
                        createdTime: file.createdTime
                    });
                } catch (parseError) {
                    logger.warn(`Failed to parse file ${file.name}:`, parseError);
                }
            }

            logger.info(`Retrieved ${results.length} test results from Google Drive`);
            return results;
        } catch (error) {
            logger.error('Failed to retrieve test results:', error);
            throw error;
        }
    }

    // Get analytics data from stored results
    async getAnalytics(filters = {}) {
        try {
            const results = await this.getTestResults(filters);

            // Calculate analytics
            const analytics = {
                totalTests: results.length,
                passedTests: results.filter(r => r.status === 'passed').length,
                failedTests: results.filter(r => r.status === 'failed').length,
                skippedTests: results.filter(r => r.status === 'skipped').length,
                blockedTests: results.filter(r => r.status === 'blocked').length,
                successRate: results.length > 0 ?
                    ((results.filter(r => r.status === 'passed').length / results.length) * 100).toFixed(2) : 0,
                frameworks: [...new Set(results.map(r => r.framework))],
                projects: [...new Set(results.map(r => r.project_name))],
                teamMembers: [...new Set(results.map(r => r.team_member_name))],
                avgExecutionTime: results.length > 0 ?
                    Math.round(results.reduce((sum, r) => sum + (r.execution_time || 0), 0) / results.length) : 0
            };

            return analytics;
        } catch (error) {
            logger.error('Failed to get analytics:', error);
            throw error;
        }
    }

    // Search test results by text
    async searchTestResults(searchTerm) {
        try {
            const query = `'${this.folderId}' in parents and trashed=false and (name contains '${searchTerm}' or fullText contains '${searchTerm}')`;

            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id, name, createdTime, properties)',
                orderBy: 'createdTime desc'
            });

            const results = [];

            for (const file of response.data.files) {
                try {
                    const fileContent = await this.drive.files.get({
                        fileId: file.id,
                        alt: 'media'
                    });

                    const testData = JSON.parse(fileContent.data);
                    results.push({
                        ...testData,
                        fileId: file.id,
                        fileName: file.name,
                        createdTime: file.createdTime
                    });
                } catch (parseError) {
                    logger.warn(`Failed to parse search result ${file.name}:`, parseError);
                }
            }

            return results;
        } catch (error) {
            logger.error('Failed to search test results:', error);
            throw error;
        }
    }

    // Delete old test results (cleanup)
    async cleanupOldResults(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const query = `'${this.folderId}' in parents and trashed=false and createdTime < '${cutoffDate.toISOString()}'`;

            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id, name, createdTime)'
            });

            let deletedCount = 0;

            for (const file of response.data.files) {
                try {
                    await this.drive.files.delete({
                        fileId: file.id
                    });
                    deletedCount++;
                    logger.info(`Deleted old test result: ${file.name}`);
                } catch (deleteError) {
                    logger.error(`Failed to delete file ${file.name}:`, deleteError);
                }
            }

            logger.info(`Cleanup completed. Deleted ${deletedCount} old test results`);
            return deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup old results:', error);
            throw error;
        }
    }

    // Get storage usage information
    async getStorageInfo() {
        try {
            const response = await this.drive.files.list({
                q: `'${this.folderId}' in parents and trashed=false`,
                fields: 'files(size, createdTime)'
            });

            const totalSize = response.data.files.reduce((sum, file) => sum + (parseInt(file.size) || 0), 0);
            const fileCount = response.data.files.length;

            return {
                totalSize: totalSize,
                fileCount: fileCount,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                oldestFile: response.data.files.length > 0 ?
                    Math.min(...response.data.files.map(f => new Date(f.createdTime))) : null
            };
        } catch (error) {
            logger.error('Failed to get storage info:', error);
            throw error;
        }
    }
}

module.exports = new GoogleDriveService();
