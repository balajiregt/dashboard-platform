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

### **✅ Test Intent & Parameter Capture**
- **Test Intent Methods** - Multiple ways to capture test purpose
- **Parameter Implementation** - Enhanced reporter with intent data
- **Dashboard Analytics** - Real-time intent pattern analysis
- **Team Collaboration** - Shared understanding of test context

## 🚀 **Step-by-Step Setup**

**Complete Setup in 5 Simple Steps:**

1. **Install Dependencies** - Add required packages
2. **Create Reporter** - Build custom OneDrive reporter
3. **Configure Playwright** - Update config file
4. **Set Environment** - Configure Azure credentials
5. **Test Integration** - Verify everything works

---

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

### **Step 4: Environment Configuration (Final Step)**

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

### **Step 5: Test the Integration**

#### **Run Your First Test with OneDrive Upload**

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

## 🎯 **Test Intent Capture Methods & Parameter Implementation**

### **1. Test Intent Capture Methods**

The setup captures test intents through multiple approaches:

#### **A. Playwright Tags & Annotations**
```javascript
// In your Playwright test files
test('Login functionality', { tag: ['@smoke', '@authentication', '@critical'] }, async ({ page }) => {
    // Test implementation
});

test.describe('Payment Flow', () => {
    test('Credit card payment', { tag: ['@regression', '@payment', '@e2e'] }, async ({ page }) => {
        // Test implementation
    });
});
```

#### **B. Environment Variables for Execution Context**
```bash
# .env file in your Playwright project
TEST_INTENT=regression          # Purpose of test run
TEST_SCOPE=critical            # Scope of testing
TEST_PRIORITY=high            # Priority level
TEST_TYPE=automated           # Type of testing
TEST_TRIGGER=scheduled        # What triggered the run
BRANCH_NAME=feature-payment   # Git branch being tested
```

#### **C. Test Metadata in Reporter**
The OneDrive reporter automatically captures:
- **Test file location** and line numbers
- **Browser and device information**
- **Execution environment** (dev/staging/prod)
- **Team member** running the tests
- **Project context** and categorization

### **2. Parameter Capture Implementation**

#### **Enhanced Reporter with Intent Data**
```javascript
// Enhanced onedrive-reporter.js
class OneDriveReporter {
    async onTestEnd(test, result) {
        if (!this.graphClient) await this.initialize();

        // Enhanced test data with intents and parameters
        const testData = {
            test_name: test.title,
            status: result.status,
            execution_time: result.duration,
            framework: 'Playwright',
            team_member_name: process.env.QA_TEAM_MEMBER || 'Unknown',
            project_name: process.env.PROJECT_NAME || 'Playwright Tests',
            environment: process.env.TEST_ENV || 'development',
            created_at: new Date().toISOString(),
            
            // 🎯 INTENT CAPTURE
            test_intent: {
                purpose: process.env.TEST_INTENT || 'development',  // regression, development, bugfix, release
                scope: process.env.TEST_SCOPE || 'functional',     // critical, high, medium, low
                priority: process.env.TEST_PRIORITY || 'normal',   // high, medium, low
                type: process.env.TEST_TYPE || 'automated',        // automated, manual, exploratory
                trigger: process.env.TEST_TRIGGER || 'manual'      // scheduled, manual, ci/cd, hotfix
            },
            
            // 🚀 EXECUTION CONTEXT
            execution_context: {
                branch: process.env.BRANCH_NAME || 'main',
                environment: process.env.TEST_ENV || 'development',
                build_number: process.env.BUILD_NUMBER || 'local',
                commit_hash: process.env.COMMIT_HASH || 'local',
                test_suite: test.parent.title || 'Default Suite'
            },
            
            // 🏷️ TEST TAGS & ANNOTATIONS
            tags: test.tags || [],
            annotations: test.annotations || [],
            
            // 📊 METADATA
            metadata: {
                browser: test.parent.project.name,
                device: test.parent.project.use.deviceName || 'Desktop',
                file: test.location.file,
                line: test.location.line,
                retry_count: result.retry || 0,
                parallel_index: test.parallelIndex || 0
            }
        };

        // Upload enhanced test data
        await this.uploadToOneDrive(testData, result);
    }
}
```

### **3. Real-World Usage Examples**

#### **Example 1: Regression Testing**
```bash
# Set environment variables for regression testing
export TEST_INTENT=regression
export TEST_SCOPE=critical
export TEST_PRIORITY=high
export TEST_TRIGGER=scheduled
export BRANCH_NAME=main
export TEST_ENV=staging

# Run tests with OneDrive upload
npx playwright test --reporter=onedrive-reporter
```

#### **Example 2: Feature Development Testing**
```bash
# Set environment variables for feature testing
export TEST_INTENT=development
export TEST_SCOPE=functional
export TEST_PRIORITY=medium
export TEST_TRIGGER=manual
export BRANCH_NAME=feature-login
export TEST_ENV=development

# Run tests with OneDrive upload
npx playwright test --reporter=onedrive-reporter
```

#### **Example 3: Bugfix Verification**
```bash
# Set environment variables for bugfix testing
export TEST_INTENT=bugfix
export TEST_SCOPE=critical
export TEST_PRIORITY=high
export TEST_TRIGGER=hotfix
export BRANCH_NAME=hotfix-login-issue
export TEST_ENV=staging

# Run tests with OneDrive upload
npx playwright test --reporter=onedrive-reporter
```

### **4. Dashboard Display of Intents & Parameters**

The dashboard shows this captured data in organized sections:

#### **A. Test Intent & Purpose Section**
```javascript
// In TeamDashboard.js
const TestIntentSection = () => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Test Intent & Purpose</h3>
            
            {/* Intent Parameters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <IntentMetric 
                    label="Purpose" 
                    value="Regression" 
                    count={45} 
                    color="blue" 
                />
                <IntentMetric 
                    label="Development" 
                    value="Feature Testing" 
                    count={23} 
                    color="green" 
                />
                <IntentMetric 
                    label="Bugfix" 
                    value="Issue Verification" 
                    count={12} 
                    color="orange" 
                />
                <IntentMetric 
                    label="Release" 
                    value="Pre-deployment" 
                    count={8} 
                    color="purple" 
                />
            </div>
            
            {/* Execution Context */}
            <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Execution Context</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Branch:</span>
                        <span className="font-medium">feature-payment</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Environment:</span>
                        <span className="font-medium">staging</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Build:</span>
                        <span className="font-medium">#1234</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
```

### **5. Advanced Intent Capture Features**

#### **A. Dynamic Intent Detection**
```javascript
// Enhanced reporter with dynamic intent detection
async detectTestIntent(test, result) {
    const intent = {
        purpose: 'development',
        scope: 'functional',
        priority: 'normal'
    };
    
    // Detect purpose from test tags
    if (test.tags.includes('@regression')) intent.purpose = 'regression';
    if (test.tags.includes('@bugfix')) intent.purpose = 'bugfix';
    if (test.tags.includes('@release')) intent.purpose = 'release';
    
    // Detect scope from test tags
    if (test.tags.includes('@critical')) intent.scope = 'critical';
    if (test.tags.includes('@high')) intent.scope = 'high';
    if (test.tags.includes('@low')) intent.scope = 'low';
    
    // Detect priority from test annotations
    if (test.annotations.priority) intent.priority = test.annotations.priority;
    
    return intent;
}
```

#### **B. CI/CD Integration**
```yaml
# GitHub Actions example
- name: Run Playwright Tests
  env:
    TEST_INTENT: ${{ github.event_name == 'push' && 'regression' || 'development' }}
    TEST_SCOPE: ${{ contains(github.event.head_commit.message, '[critical]') && 'critical' || 'functional' }}
    TEST_PRIORITY: ${{ contains(github.event.head_commit.message, '[high]') && 'high' || 'normal' }}
    TEST_TRIGGER: ${{ github.event_name }}
    BRANCH_NAME: ${{ github.ref_name }}
    BUILD_NUMBER: ${{ github.run_number }}
    COMMIT_HASH: ${{ github.sha }}
  run: npx playwright test --reporter=onedrive-reporter
```

#### **C. Package.json Scripts with Environment (Recommended)**

Create standardized scripts in your `package.json` for different test scenarios:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:regression": "cross-env TEST_INTENT=regression TEST_SCOPE=critical TEST_PRIORITY=high TEST_TRIGGER=scheduled TEST_ENV=staging npx playwright test --reporter=onedrive-reporter",
    "test:feature": "cross-env TEST_INTENT=development TEST_SCOPE=functional TEST_PRIORITY=medium TEST_TRIGGER=manual TEST_ENV=development npx playwright test --reporter=onedrive-reporter",
    "test:bugfix": "cross-env TEST_INTENT=bugfix TEST_SCOPE=critical TEST_PRIORITY=high TEST_TRIGGER=hotfix TEST_ENV=staging npx playwright test --reporter=onedrive-reporter",
    "test:smoke": "cross-env TEST_INTENT=regression TEST_SCOPE=critical TEST_PRIORITY=high TEST_TRIGGER=scheduled TEST_ENV=staging npx playwright test --grep @smoke --reporter=onedrive-reporter",
    "test:e2e": "cross-env TEST_INTENT=regression TEST_SCOPE=critical TEST_PRIORITY=high TEST_TRIGGER=scheduled TEST_ENV=staging npx playwright test --grep @e2e --reporter=onedrive-reporter",
    "test:critical": "cross-env TEST_INTENT=regression TEST_SCOPE=critical TEST_PRIORITY=high TEST_TRIGGER=manual TEST_ENV=staging npx playwright test --grep @critical --reporter=onedrive-reporter"
  }
}
```

**Install cross-env for cross-platform compatibility:**
```bash
npm install --save-dev cross-env
```

**Usage Examples:**
```bash
# Run regression tests
npm run test:regression

# Run feature development tests
npm run test:feature

# Run bugfix verification tests
npm run test:bugfix

# Run smoke tests only
npm run test:smoke

# Run end-to-end tests
npm run test:e2e

# Run critical tests only
npm run test:critical
```

**Benefits:**
✅ **No manual export commands needed**
✅ **Consistent environment variables every time**
✅ **Easy to remember and use**
✅ **Team standardization**
✅ **Cross-platform compatibility**
✅ **Quick switching between test types**

### **6. Dashboard Analytics on Intents**

The dashboard provides insights like:

- **Intent Distribution**: What percentage of tests are regression vs development
- **Scope Analysis**: Critical vs functional test distribution
- **Priority Trends**: High priority test patterns over time
- **Trigger Analysis**: What's driving test execution
- **Branch Correlation**: Which branches have most test activity

---

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

### **Recommended Daily Workflow**
Use Strategy 4 (Package.json Scripts) for consistent test execution:

```bash
# Morning: Quick smoke test
npm run test:smoke

# Development: Feature testing
npm run test:feature

# Bugfix: Issue verification
npm run test:bugfix

# End of day: Full regression
npm run test:regression
```

### **Ready to Use**
Once you complete the 5 steps above, you can run tests with:
```bash
npx playwright test --reporter=onedrive-reporter
```

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
