const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const { ClientSecretCredential } = require('@azure/identity');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class OneDriveService {
    constructor() {
        this.client = null;
        this.folderId = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Load credentials from environment or file
            const credentials = this.loadCredentials();

            // Create Azure credential
            const credential = new ClientSecretCredential(
                credentials.tenantId,
                credentials.clientId,
                credentials.clientSecret
            );

            // Create authentication provider
            const authProvider = new TokenCredentialAuthenticationProvider(credential, {
                scopes: ['https://graph.microsoft.com/.default']
            });

            // Create Graph client
            this.client = Client.initWithMiddleware({
                authProvider: authProvider
            });

            // Get or create the QA Dashboard folder
            this.folderId = await this.getOrCreateQAFolder();

            logger.info('OneDrive service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize OneDrive service:', error);
            throw error;
        }
    }

    loadCredentials() {
        // Try to load from environment variables first
        if (process.env.ONEDRIVE_TENANT_ID && process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET) {
            return {
                tenantId: process.env.ONEDRIVE_TENANT_ID,
                clientId: process.env.ONEDRIVE_CLIENT_ID,
                clientSecret: process.env.ONEDRIVE_CLIENT_SECRET
            };
        }

        // Try to load from credentials file
        const credentialsPath = path.join(__dirname, '../../credentials/onedrive-credentials.json');
        if (fs.existsSync(credentialsPath)) {
            return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        }

        throw new Error('OneDrive credentials not found. Please set environment variables or create credentials file.');
    }

    async getOrCreateQAFolder() {
        try {
            // Search for existing QA Dashboard folder
            const response = await this.client
                .api('/me/drive/root/children')
                .filter("name eq 'QA Dashboard' and folder ne null")
                .get();

            if (response.value.length > 0) {
                logger.info('Using existing QA Dashboard folder');
                return response.value[0].id;
            }

            // Create new QA Dashboard folder
            const folderMetadata = {
                name: 'QA Dashboard',
                folder: {},
                '@microsoft.graph.conflictBehavior': 'rename'
            };

            const folder = await this.client
                .api('/me/drive/root/children')
                .post(folderMetadata);

            logger.info('Created new QA Dashboard folder');
            return folder.id;
        } catch (error) {
            logger.error('Failed to get or create QA folder:', error);
            throw error;
        }
    }

    // Store test results in OneDrive
    async storeTestResult(testData) {
        try {
            const fileName = `test-result-${Date.now()}-${testData.test_name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;

            // Convert test data to JSON
            const fileContent = JSON.stringify(testData, null, 2);

            // Upload file to OneDrive
            const file = await this.client
                .api(`/me/drive/items/${this.folderId}:/${fileName}:/content`)
                .put(fileContent, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

            // Add custom properties for filtering
            await this.client
                .api(`/me/drive/items/${file.id}`)
                .patch({
                    '@microsoft.graph.conflictBehavior': 'replace',
                    additionalData: {
                        testName: testData.test_name,
                        status: testData.status,
                        teamMember: testData.team_member_name,
                        project: testData.project_name,
                        framework: testData.framework,
                        timestamp: new Date().toISOString()
                    }
                });

            logger.info(`Test result stored in OneDrive: ${fileName}`);
            return {
                fileId: file.id,
                fileName: fileName,
                createdTime: file.createdDateTime
            };
        } catch (error) {
            logger.error('Failed to store test result:', error);
            throw error;
        }
    }

    // Retrieve test results from OneDrive
    async getTestResults(filters = {}) {
        try {
            let query = `/me/drive/items/${this.folderId}/children`;

            // Add filters if provided
            if (filters.startDate || filters.endDate || filters.status || filters.teamMember || filters.project) {
                query += '?$filter=';
                const filterConditions = [];

                if (filters.startDate) {
                    filterConditions.push(`createdDateTime ge '${filters.startDate}'`);
                }
                if (filters.endDate) {
                    filterConditions.push(`createdDateTime le '${filters.endDate}'`);
                }

                if (filterConditions.length > 0) {
                    query += filterConditions.join(' and ');
                }
            }

            const response = await this.client
                .api(query)
                .filter("file ne null")
                .orderby('createdDateTime desc')
                .get();

            const results = [];

            // Process each file to extract test data
            for (const file of response.value) {
                try {
                    // Download file content
                    const fileContent = await this.client
                        .api(`/me/drive/items/${file.id}/content`)
                        .get();

                    const testData = JSON.parse(fileContent);
                    results.push({
                        ...testData,
                        fileId: file.id,
                        fileName: file.name,
                        createdTime: file.createdDateTime
                    });
                } catch (parseError) {
                    logger.warn(`Failed to parse file ${file.name}:`, parseError);
                }
            }

            // Apply additional filters that couldn't be done at API level
            let filteredResults = results;

            if (filters.status) {
                filteredResults = filteredResults.filter(r => r.status === filters.status);
            }
            if (filters.teamMember) {
                filteredResults = filteredResults.filter(r => r.team_member_name === filters.teamMember);
            }
            if (filters.project) {
                filteredResults = filteredResults.filter(r => r.project_name === filters.project);
            }

            logger.info(`Retrieved ${filteredResults.length} test results from OneDrive`);
            return filteredResults;
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
            const response = await this.client
                .api(`/me/drive/items/${this.folderId}/search(q='${searchTerm}')`)
                .get();

            const results = [];

            for (const file of response.value) {
                try {
                    // Download file content
                    const fileContent = await this.client
                        .api(`/me/drive/items/${file.id}/content`)
                        .get();

                    const testData = JSON.parse(fileContent);
                    results.push({
                        ...testData,
                        fileId: file.id,
                        fileName: file.name,
                        createdTime: file.createdDateTime
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

            const response = await this.client
                .api(`/me/drive/items/${this.folderId}/children`)
                .filter(`createdDateTime lt '${cutoffDate.toISOString()}'`)
                .get();

            let deletedCount = 0;

            for (const file of response.value) {
                try {
                    await this.client
                        .api(`/me/drive/items/${file.id}`)
                        .delete();
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
            const response = await this.client
                .api(`/me/drive/items/${this.folderId}/children`)
                .get();

            const totalSize = response.value.reduce((sum, file) => sum + (parseInt(file.size) || 0), 0);
            const fileCount = response.value.length;

            return {
                totalSize: totalSize,
                fileCount: fileCount,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                oldestFile: response.value.length > 0 ?
                    Math.min(...response.value.map(f => new Date(f.createdDateTime))) : null
            };
        } catch (error) {
            logger.error('Failed to get storage info:', error);
            throw error;
        }
    }
}

module.exports = new OneDriveService();
