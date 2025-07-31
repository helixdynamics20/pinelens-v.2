# 🔑 Real Jira API Integration Setup

## ✅ **Ready to Use Your Real Credentials!**

I've updated the system to work with your actual Jira API token. Here's how to test it:

### 🎯 **Step 1: Get Your Jira API Token**

1. **Go to**: https://id.atlassian.com/manage-profile/security/api-tokens
2. **Click**: "Create API token"
3. **Label**: "PineLens Integration" 
4. **Copy**: The generated token (it will be a long string like `ATATT3xFfGF0...`)

### 🎯 **Step 2: Configure in PineLens**

1. **Open**: http://localhost:5174
2. **Click**: "In-House" tab
3. **Verify**: Base URL is `https://qc-hub.atlassian.net`
4. **Verify**: Email is `vishal.kumar10@pinelabs.com`
5. **Paste**: Your real API token in the "API Token" field
6. **Click**: "Connect Jira"

### 🎯 **Step 3: Test Real Integration**

After successful connection, try these searches:

#### **Main Search (Go to Home page):**
- Search: `assignee = "vishal.kumar10@pinelabs.com"`
- Search: `project = NSVP`
- Search: `status = "In Progress"`
- Search: `text ~ "payment"`

#### **Test Connection (In-House tab):**
- Click "Test Connection" to see your real projects

### 🔍 **What You'll See**

#### **With Real API Token:**
- ✅ "Jira connection successful with REAL API!"
- ✅ Your actual name and account details
- ✅ Real search results from your Jira tickets
- ✅ Actual project names and issue counts

#### **With Demo/Invalid Token:**
- ⚠️ "Using demo data" message
- 🎭 Mock NSVP-27299 issue for testing

### 🛡️ **Security Notes**

- ✅ **CORS Bypassed**: Direct API calls work from browser
- ✅ **Credentials Secure**: Only stored in browser memory
- ✅ **No Server Storage**: API token not saved anywhere
- ⚠️ **Token Validation**: Real API calls validate your permissions

### 🚀 **Expected Results**

Once connected with real credentials, searches will return:
- **Your actual Jira issues**
- **Real project names** 
- **Actual assignees and statuses**
- **Live data** from qc-hub.atlassian.net

### 🔧 **Troubleshooting**

If connection fails:
1. **Check Token**: Make sure it's not expired
2. **Check Permissions**: Token needs read access to Jira
3. **Check Network**: Ensure you can access qc-hub.atlassian.net
4. **Check Console**: Browser dev tools will show detailed errors

---

**Ready to test with your real Jira data!** 🎉

**URL**: http://localhost:5174 → In-House tab → Enter your API token → Connect!
