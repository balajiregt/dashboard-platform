# 🚀 Playwright Test Project Configuration for OneDrive Integration

This guide shows you how to configure your existing Playwright test project to automatically upload test results, trace files, and artifacts to OneDrive. This integration enables real-time collaboration and comprehensive test analysis through the centralized QA dashboard platform.

## 🎯 **What This Integration Provides**

### **✅ Automatic Upload to OneDrive**
- **Test Results JSON** - Complete execution data and metadata
- **Trace Files (.zip)** - Full Playwright execution traces
- **Screenshots** - Failure captures and visual records
- **Videos** - Test execution recordings
- **Console Logs** - Browser console output
- **Network Logs** - API calls and responses

### **✅ Real-Time Dashboard Integration**
- **Immediate visibility** - Test results appear in dashboard instantly
- **Team collaboration** - All members see same data
- **No server dependency** - Cloud-based storage
- **Professional reliability** - Enterprise-grade infrastructure

## 🚀 **Step-by-Step Setup**

### **Step 1: Install Required Dependencies**

Add these packages to your Playwright project:

```bash
npm install @microsoft/microsoft-graph-client @azure/identity axios
```

**Package Details:**
- **`@microsoft/microsoft-graph-client`** - Microsoft Graph API client for OneDrive
- **`@azure/identity`** - Azure authentication and credential management
- **`axios`** - HTTP client for additional API calls (if needed)

### **Step 2: Create Custom OneDrive Reporter**

Create a new file `playwright-reporters/onedrive-reporter.js`:

```javascript
const { MicrosoftGraphClient } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const fs = require('fs');
const path = require('path');

class OneDriveReporter {
    constructor(options = {}) {
        this.tenantId = options.tenantId;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.folderId = options.folderId || 'QA Dashboard';
        this.graphClient = null;
    }

    async initialize() {
        const credential = new ClientSecretCredential(
            this.tenantId,
            this.clientId,
            this.clientSecret
        );

        this.graphClient = MicrosoftGraphClient.init({
            authProvider: credential
        });
    }

    async onTestEnd(test, result) {
        if (!this.graphClient) await this.initialize();

        const testData = {
            test_name: test.title,
            status: result.status,
            execution_time: result.duration,
            framework: 'Playwright',
            team_member_name: process.env.QA_TEAM_MEMBER || 'Unknown',
            project_name: process.env.PROJECT_NAME || 'Playwright Tests',
            environment: process.env.TEST_ENV || 'development',
            created_at: new Date().toISOString(),
            metadata: {
                browser: test.parent.project.name,
                device: test.parent.project.use.deviceName || 'Desktop',
                tags: test.tags || [],
                file: test.location.file,
                line: test.location.line
            }
        };

        // Upload test result to OneDrive
        await this.uploadToOneDrive(testData, result);
    }

    async uploadToOneDrive(testData, result) {
        try {
            const fileName = `test-result-${Date.now()}-${testData.test_name.replace(/\s+/g, '-')}.json`;
            
            // Upload test result JSON
            await this.graphClient.api('/me/drive/root:/QA Dashboard/' + fileName + ':/content')
                .put(JSON.stringify(testData, null, 2));

            // Upload trace file if exists
            if (result.trace && fs.existsSync(result.trace)) {
                const traceFileName = `trace-${Date.now()}-${testData.test_name.replace(/\s+/g, '-')}.zip`;
                const traceContent = fs.readFileSync(result.trace);
                
                await this.graphClient.api('/me/drive/root:/QA Dashboard/' + traceFileName + ':/content')
                    .put(traceContent);
            }

            // Upload screenshots if test failed
            if (result.status === 'failed' && result.attachments) {
                for (const attachment of result.attachments) {
                    if (attachment.contentType.startsWith('image/')) {
                        const screenshotName = `screenshot-${Date.now()}-${testData.test_name.replace(/\s+/g, '-')}.png`;
                        const screenshotContent = fs.readFileSync(attachment.path);
                        
                        await this.graphClient.api('/me/drive/root:/QA Dashboard/' + screenshotName + ':/content')
                            .put(screenshotContent);
                    }
                }
            }

            console.log(`✅ Test result uploaded to OneDrive: ${fileName}`);
        } catch (error) {
            console.error(`❌ Failed to upload to OneDrive:`, error);
        }
    }
}

module.exports = OneDriveReporter;
```

### **Step 3: Configure Playwright Config**

Update your `playwright.config.js` to include the OneDrive reporter:

```javascript
// playwright.config.js
const OneDriveReporter = require('./playwright-reporters/onedrive-reporter');

module.exports = {
    // ... your existing config
    
    // Add OneDrive reporter to your reporter configuration
    reporter: [
        ['html'],                                    // Keep existing HTML reporter
        ['json', { outputFile: 'test-results/results.json' }], // Keep existing JSON reporter
        [OneDriveReporter, {                        // Add OneDrive reporter
            tenantId: process.env.AZURE_TENANT_ID,
            clientId: process.env.AZURE_CLIENT_ID,
            clientSecret: process.env.AZURE_CLIENT_SECRET,
            folderId: 'QA Dashboard'
        }]
    ],
    
    // Enable comprehensive test artifacts
    use: {
        trace: 'on-first-retry',     // Generate trace files on retry
        screenshot: 'only-on-failure', // Capture screenshots on failures
        video: 'retain-on-failure'   // Record videos on failures
    },

    // ... rest of your existing configuration
};
```

### **Step 4: Environment Configuration**

Create a `.env` file in your Playwright project root:

```bash
# .env
# Azure Entra ID Configuration (reuse your existing app)
AZURE_TENANT_ID=your_existing_tenant_id
AZURE_CLIENT_ID=your_existing_client_id
AZURE_CLIENT_SECRET=your_existing_client_secret

# Test Execution Context
QA_TEAM_MEMBER=Your Name
PROJECT_NAME=Your Project Name
TEST_ENV=staging

# Optional: Custom OneDrive folder
ONEDRIVE_FOLDER=QA Dashboard
```

**Environment Variables Explained:**
- **`AZURE_TENANT_ID`** - Your Azure tenant ID (reuse existing)
- **`AZURE_CLIENT_ID`** - Your Azure app client ID (reuse existing)
- **`AZURE_CLIENT_SECRET`** - Your Azure app secret (reuse existing)
- **`QA_TEAM_MEMBER`** - Your name for team identification
- **`PROJECT_NAME`** - Your project name for categorization
- **`TEST_ENV`** - Test environment (dev, staging, prod)

### **Step 5: Update Package.json Scripts**

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:onedrive": "playwright test --reporter=onedrive-reporter",
    "test:with-traces": "playwright test --trace on",
    "test:upload-all": "playwright test --reporter=onedrive-reporter --trace on --screenshot on --video on",
    "test:smoke:onedrive": "playwright test --grep @smoke --reporter=onedrive-reporter",
    "test:regression:onedrive": "playwright test --grep @regression --reporter=onedrive-reporter"
  }
}
```

**Script Explanations:**
- **`test:onedrive`** - Run tests with OneDrive upload
- **`test:with-traces`** - Run tests with trace file generation
- **`test:upload-all`** - Run tests with all artifacts and upload
- **`test:smoke:onedrive`** - Run smoke tests with OneDrive upload
- **`test:regression:onedrive`** - Run regression tests with OneDrive upload

## 🧪 **Testing the Integration**

### **Run Your First Test with OneDrive Upload**

```bash
# Test the integration with a simple test
npm run test:onedrive

# Or run specific tests
npx playwright test --grep "Login" --reporter=onedrive-reporter
```

### **Verify Upload Success**

1. **Check console output** for upload confirmation messages
2. **Verify in OneDrive** - Check "QA Dashboard" folder
3. **Check dashboard** - Results should appear immediately

## 📁 **Data Structure in OneDrive**

### **Folder Organization**
```
OneDrive/
└── QA Dashboard/
    ├── test-result-1705312345678-login-test.json
    ├── trace-1705312345678-login-test.zip
    ├── screenshot-1705312345678-login-test.png
    ├── test-result-1705312345679-payment-test.json
    ├── trace-1705312345679-payment-test.zip
    └── ...
```

### **Test Result JSON Structure**
```json
{
  "test_name": "Login Test",
  "status": "passed",
  "execution_time": 1500,
  "framework": "Playwright",
  "team_member_name": "John Doe",
  "project_name": "E-commerce Platform",
  "environment": "staging",
  "created_at": "2024-01-15T10:30:00Z",
  "metadata": {
    "browser": "chromium",
    "device": "Desktop",
    "tags": ["smoke", "authentication"],
    "file": "tests/login.spec.js",
    "line": 15
  }
}
```

## 🔧 **Advanced Configuration**

### **Custom OneDrive Folder Structure**

Modify the reporter to create organized folder structures:

```javascript
// In onedrive-reporter.js
async uploadToOneDrive(testData, result) {
    const dateFolder = new Date().toISOString().split('T')[0];
    const projectFolder = testData.project_name.replace(/\s+/g, '-');
    const basePath = `QA Dashboard/${projectFolder}/${dateFolder}`;
    
    // Create organized folder structure
    const fileName = `test-result-${Date.now()}-${testData.test_name.replace(/\s+/g, '-')}.json`;
    const filePath = `${basePath}/${fileName}`;
    
    // Upload to organized structure
    await this.graphClient.api(`/me/drive/root:/${filePath}:/content`)
        .put(JSON.stringify(testData, null, 2));
}
```

### **Batch Upload for Multiple Tests**

For better performance with large test suites:

```javascript
async onEnd(result) {
    if (!this.graphClient) await this.initialize();
    
    // Batch upload all test results
    const uploadPromises = result.tests.map(test => 
        this.uploadToOneDrive(test.data, test.result)
    );
    
    await Promise.all(uploadPromises);
    console.log(`✅ Uploaded ${result.tests.length} test results to OneDrive`);
}
```

## 🚨 **Troubleshooting**

### **Common Issues and Solutions**

#### **1. Authentication Errors**
```bash
# Check environment variables
echo $AZURE_TENANT_ID
echo $AZURE_CLIENT_ID
echo $AZURE_CLIENT_SECRET

# Verify Azure app permissions
# Ensure app has Microsoft Graph API permissions
```

#### **2. Upload Failures**
```bash
# Check network connectivity
# Verify OneDrive folder exists
# Check file permissions
# Review console error messages
```

#### **3. Missing Trace Files**
```javascript
// Ensure trace is enabled in config
use: {
    trace: 'on-first-retry'  // or 'on' for all tests
}
```

### **Debug Mode**

Enable debug logging:

```javascript
// Add to onedrive-reporter.js
constructor(options = {}) {
    // ... existing code
    this.debug = options.debug || false;
}

async uploadToOneDrive(testData, result) {
    if (this.debug) {
        console.log('🔍 Debug: Uploading test data:', testData);
        console.log('🔍 Debug: Test result:', result);
    }
    // ... rest of upload logic
}
```

## 🔒 **Security Best Practices**

### **Credential Management**
- ✅ **Use environment variables** - Never hardcode secrets
- ✅ **Reuse existing Azure app** - No new credentials needed
- ✅ **Minimal permissions** - Only OneDrive access required
- ✅ **Regular secret rotation** - Update expired secrets

### **Data Privacy**
- ✅ **Team member identification** - Track who ran tests
- ✅ **Project categorization** - Organize by project
- ✅ **Environment separation** - Distinguish dev/staging/prod
- ✅ **Access control** - Use existing Azure app permissions

## 📊 **Integration with Dashboard**

### **Real-Time Data Flow**
```
Playwright Test → OneDrive Reporter → OneDrive → Dashboard
     ↓                    ↓              ↓          ↓
Test Execution    Upload Results   Cloud Storage  Team View
```

### **Dashboard Features Available**
- **Live test results** - Immediate visibility
- **Trace file analysis** - Interactive trace viewer
- **Team collaboration** - Shared test artifacts
- **Performance metrics** - Resource usage analysis
- **Failure analysis** - Screenshots and error details

## 🎯 **Next Steps**

### **Immediate Actions**
1. **Install dependencies** in your Playwright project
2. **Create the OneDrive reporter** file
3. **Update Playwright config** to include reporter
4. **Set environment variables** with your Azure credentials
5. **Test the integration** with a simple test run

### **Advanced Features**
1. **Custom folder structures** for better organization
2. **Batch upload** for performance optimization
3. **Error handling** and retry mechanisms
4. **Integration with CI/CD** pipelines
5. **Custom metadata** for enhanced analysis

## 🆘 **Support & Resources**

### **Documentation**
- **Playwright Reporter API**: [https://playwright.dev/docs/test-reporters](https://playwright.dev/docs/test-reporters)
- **Microsoft Graph API**: [https://docs.microsoft.com/graph/api/overview](https://docs.microsoft.com/graph/api/overview)
- **Azure Identity**: [https://docs.microsoft.com/javascript/api/overview/azure/identity-readme](https://docs.microsoft.com/javascript/api/overview/azure/identity-readme)

### **Community Support**
- **Playwright Discord**: [https://discord.gg/playwright](https://discord.gg/playwright)
- **GitHub Issues**: [https://github.com/microsoft/playwright/issues](https://github.com/microsoft/playwright/issues)

---

**🎭 Transform your Playwright tests into a collaborative, cloud-based QA platform!**

**With this integration, your team can now:**
- ✅ **Automatically upload** test results to OneDrive
- ✅ **Share trace files** and detailed test information
- ✅ **Collaborate in real-time** through the dashboard
- ✅ **Analyze test patterns** across the entire team
- ✅ **Maintain professional reliability** with cloud storage

**Ready to integrate? Start with Step 1 and transform your testing workflow! 🚀**
