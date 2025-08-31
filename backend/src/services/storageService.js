const googleDriveService = require('./googleDriveService');
const oneDriveService = require('./oneDriveService');
const { logger } = require('../utils/logger');

class UnifiedStorageService {
    constructor() {
        this.storageProvider = null;
        this.providerName = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Determine which storage provider to use based on environment
            if (process.env.STORAGE_PROVIDER) {
                this.providerName = process.env.STORAGE_PROVIDER.toLowerCase();
            } else {
                // Auto-detect based on available credentials
                if (process.env.GOOGLE_DRIVE_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                    this.providerName = 'google-drive';
                } else if (process.env.ONEDRIVE_TENANT_ID && process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET) {
                    this.providerName = 'onedrive';
                } else {
                    this.providerName = 'local'; // Fallback to local storage
                }
            }

            // Initialize the selected provider
            await this.initializeProvider();

            logger.info(`Storage service initialized with provider: ${this.providerName}`);
        } catch (error) {
            logger.error('Failed to initialize storage service:', error);
            throw error;
        }
    }

    async initializeProvider() {
        try {
            switch (this.providerName) {
                case 'google-drive':
                    this.storageProvider = googleDriveService;
                    await this.storageProvider.initialize();
                    break;

                case 'onedrive':
                    this.storageProvider = oneDriveService;
                    await this.storageProvider.initialize();
                    break;

                case 'local':
                    this.storageProvider = this.createLocalStorageProvider();
                    break;

                default:
                    throw new Error(`Unsupported storage provider: ${this.providerName}`);
            }
        } catch (error) {
            logger.error(`Failed to initialize ${this.providerName} provider:`, error);
            // Fallback to local storage
            logger.info('Falling back to local storage');
            this.providerName = 'local';
            this.storageProvider = this.createLocalStorageProvider();
        }
    }

    createLocalStorageProvider() {
        const fs = require('fs');
        const path = require('path');

        // Ensure local storage directory exists
        const storageDir = path.join(__dirname, '../../data/test-results');
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        return {
            async storeTestResult(testData) {
                try {
                    const fileName = `test-result-${Date.now()}-${testData.test_name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
                    const filePath = path.join(storageDir, fileName);

                    // Store test data with metadata
                    const fileData = {
                        ...testData,
                        storedAt: new Date().toISOString(),
                        storageType: 'local'
                    };

                    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));

                    logger.info(`Test result stored locally: ${fileName}`);
                    return {
                        fileId: fileName,
                        fileName: fileName,
                        createdTime: new Date().toISOString()
                    };
                } catch (error) {
                    logger.error('Failed to store test result locally:', error);
                    throw error;
                }
            },

            async getTestResults(filters = {}) {
                try {
                    const files = fs.readdirSync(storageDir);
                    const results = [];

                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            try {
                                const filePath = path.join(storageDir, file);
                                const fileContent = fs.readFileSync(filePath, 'utf8');
                                const testData = JSON.parse(fileContent);

                                // Apply filters
                                if (filters.startDate && new Date(testData.created_at) < new Date(filters.startDate)) {
                                    continue;
                                }
                                if (filters.endDate && new Date(testData.created_at) > new Date(filters.endDate)) {
                                    continue;
                                }
                                if (filters.status && testData.status !== filters.status) {
                                    continue;
                                }
                                if (filters.teamMember && testData.team_member_name !== filters.teamMember) {
                                    continue;
                                }
                                if (filters.project && testData.project_name !== filters.project) {
                                    continue;
                                }

                                results.push({
                                    ...testData,
                                    fileId: file,
                                    fileName: file,
                                    createdTime: testData.created_at
                                });
                            } catch (parseError) {
                                logger.warn(`Failed to parse local file ${file}:`, parseError);
                            }
                        }
                    }

                    // Sort by creation time (newest first)
                    results.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

                    logger.info(`Retrieved ${results.length} test results from local storage`);
                    return results;
                } catch (error) {
                    logger.error('Failed to retrieve test results from local storage:', error);
                    throw error;
                }
            },

            async getAnalytics(filters = {}) {
                try {
                    const results = await this.getTestResults(filters);

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
                    logger.error('Failed to get analytics from local storage:', error);
                    throw error;
                }
            },

            async searchTestResults(searchTerm) {
                try {
                    const results = await this.getTestResults();
                    return results.filter(result =>
                        result.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        result.team_member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        result.project_name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                } catch (error) {
                    logger.error('Failed to search local test results:', error);
                    throw error;
                }
            },

            async cleanupOldResults(daysToKeep = 90) {
                try {
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

                    const files = fs.readdirSync(storageDir);
                    let deletedCount = 0;

                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            try {
                                const filePath = path.join(storageDir, file);
                                const fileContent = fs.readFileSync(filePath, 'utf8');
                                const testData = JSON.parse(fileContent);

                                if (new Date(testData.created_at) < cutoffDate) {
                                    fs.unlinkSync(filePath);
                                    deletedCount++;
                                    logger.info(`Deleted old local test result: ${file}`);
                                }
                            } catch (parseError) {
                                logger.warn(`Failed to parse local file ${file} for cleanup:`, parseError);
                            }
                        }
                    }

                    logger.info(`Local cleanup completed. Deleted ${deletedCount} old test results`);
                    return deletedCount;
                } catch (error) {
                    logger.error('Failed to cleanup old local results:', error);
                    throw error;
                }
            },

            async getStorageInfo() {
                try {
                    const files = fs.readdirSync(storageDir);
                    let totalSize = 0;

                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const filePath = path.join(storageDir, file);
                            const stats = fs.statSync(filePath);
                            totalSize += stats.size;
                        }
                    }

                    return {
                        totalSize: totalSize,
                        fileCount: files.filter(f => f.endsWith('.json')).length,
                        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                        oldestFile: null // Would need to scan all files to determine
                    };
                } catch (error) {
                    logger.error('Failed to get local storage info:', error);
                    throw error;
                }
            }
        };
    }

    // Unified interface methods
    async storeTestResult(testData) {
        return await this.storageProvider.storeTestResult(testData);
    }

    async getTestResults(filters = {}) {
        return await this.storageProvider.getTestResults(filters);
    }

    async getAnalytics(filters = {}) {
        return await this.storageProvider.getAnalytics(filters);
    }

    async searchTestResults(searchTerm) {
        return await this.storageProvider.searchTestResults(searchTerm);
    }

    async cleanupOldResults(daysToKeep = 90) {
        return await this.storageProvider.cleanupOldResults(daysToKeep);
    }

    async getStorageInfo() {
        return await this.storageProvider.getStorageInfo();
    }

    // Get current provider information
    getProviderInfo() {
        return {
            name: this.providerName,
            type: this.providerName === 'local' ? 'local' : 'cloud',
            description: this.getProviderDescription()
        };
    }

    getProviderDescription() {
        switch (this.providerName) {
            case 'google-drive':
                return 'Google Drive Cloud Storage';
            case 'onedrive':
                return 'Microsoft OneDrive Cloud Storage';
            case 'local':
                return 'Local File System Storage';
            default:
                return 'Unknown Storage Provider';
        }
    }

    // Switch storage provider dynamically
    async switchProvider(newProvider) {
        try {
            logger.info(`Switching storage provider from ${this.providerName} to ${newProvider}`);

            this.providerName = newProvider.toLowerCase();
            await this.initializeProvider();

            logger.info(`Successfully switched to ${this.providerName} provider`);
            return true;
        } catch (error) {
            logger.error(`Failed to switch to ${newProvider} provider:`, error);
            return false;
        }
    }
}

module.exports = new UnifiedStorageService();
