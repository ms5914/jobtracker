const jobSites = {
  'linkedin.com': {
    applyPattern: /\/jobs\/view|\/jobs\/apply/,
    companySelector: '.job-details-jobs-unified-top-card__company-name',
    titleSelector: '.job-details-jobs-unified-top-card__job-title'
  },
  'indeed.com': {
    applyPattern: /\/job\/apply|\/viewjob/,
    companySelector: '.jobsearch-InlineCompanyRating',
    titleSelector: '.jobsearch-JobInfoHeader-title'
  },
  'glassdoor.com': {
    applyPattern: /\/job-listing|\/apply\//,
    companySelector: '.employer-name',
    titleSelector: '.job-title'
  },
  'greenhouse.io': {
    applyPattern: /\/job\/|\/jobs\/|\/embed\/job/,
    companySelector: '.company-name, .header-company-name',
    titleSelector: '.app-title, .posting-header h2'
  },
  'lever.co': {
    applyPattern: /\/jobs\//,
    companySelector: '.main-header-logo',
    titleSelector: '.posting-headline h2'
  }
};

// Track navigation to job pages
chrome.webNavigation.onCompleted.addListener(async (details) => {
  const url = new URL(details.url);
  const domain = url.hostname;
  
  // Check known job sites
  const siteConfig = Object.entries(jobSites).find(([key]) => domain.includes(key));
  
  if (siteConfig && siteConfig[1].applyPattern.test(url.pathname)) {
    chrome.tabs.sendMessage(details.tabId, {
      action: 'extractJobDetails',
      selectors: siteConfig[1]
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveApplication') {
    saveApplication(message.data);
  }
});

// Save application to storage
async function saveApplication(application) {
  const storage = await chrome.storage.local.get(['applications']);
  const applications = storage.applications || [];
  
  // Check for duplicates
  const isDuplicate = applications.some(app => 
    app.companyName === application.companyName &&
    app.position === application.position &&
    app.applicationUrl === application.applicationUrl
  );
  
  if (!isDuplicate) {
    applications.push({
      ...application,
      status: 'applied',
      date: new Date().toISOString(),
      autoDetected: true
    });
    
    await chrome.storage.local.set({ applications });
    
    // Notify user
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  }
}
