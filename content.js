// content.js
// Initialize message listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractJobDetails') {
    const jobDetails = extractJobDetails(message.selectors);
    if (jobDetails) {
      chrome.runtime.sendMessage({
        action: 'saveApplication',
        data: jobDetails
      });
    }
  }
});

// Extract job details from standard job boards
function extractJobDetails(selectors) {
  const companyElement = document.querySelector(selectors.companySelector);
  const titleElement = document.querySelector(selectors.titleSelector);
  
  if (companyElement && titleElement) {
    return {
      companyName: companyElement.textContent.trim(),
      position: titleElement.textContent.trim(),
      applicationUrl: window.location.href,
      source: new URL(window.location.href).hostname
    };
  }
  return null;
}

// Detect embedded job boards
function detectEmbeddedJobBoards() {
  const scripts = document.getElementsByTagName('script');
  for (const script of scripts) {
    const src = script.getAttribute('src') || '';
    
    // Greenhouse embed detection
    if (src.includes('boards.greenhouse.io/embed')) {
      const companyMatch = src.match(/for=([^&]+)/);
      if (companyMatch) {
        const companyId = companyMatch[1];
        observeGreenhouseEmbed(companyId);
      }
    }
  }
}

// Observe Greenhouse embedded board
function observeGreenhouseEmbed(companyId) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const applicationForms = document.querySelectorAll('iframe[src*="boards.greenhouse.io/embed/job_app"]');
      
      applicationForms.forEach(form => {
        form.addEventListener('load', () => {
          try {
            const iframeDoc = form.contentDocument || form.contentWindow.document;
            const submitButton = iframeDoc.querySelector('input[type="submit"], button[type="submit"]');
            if (submitButton) {
              submitButton.addEventListener('click', () => {
                const jobDetails = extractEmbeddedJobDetails(companyId);
                if (jobDetails) {
                  chrome.runtime.sendMessage({
                    action: 'saveApplication',
                    data: jobDetails
                  });
                }
              });
            }
          } catch (e) {
            console.log('Cross-origin restrictions prevented form monitoring');
          }
        });
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Extract details from embedded job board
function extractEmbeddedJobDetails(companyId) {
  let jobDetails = {
    companyName: '',
    position: '',
    applicationUrl: window.location.href,
    source: 'Greenhouse (Embedded)',
    boardType: 'greenhouse',
    companyId: companyId
  };

  const companySelectors = [
    '.company-name',
    '.header-company-name',
    'meta[property="og:site_name"]',
    'title'
  ];

  for (const selector of companySelectors) {
    const element = document.querySelector(selector);
    if (element) {
      jobDetails.companyName = element.content || element.textContent.trim();
      break;
    }
  }

  if (!jobDetails.companyName) {
    jobDetails.companyName = companyId.charAt(0).toUpperCase() + companyId.slice(1);
  }

  const titleSelectors = [
    '.app-title',
    '.posting-header h2',
    'meta[property="og:title"]',
    '.job-title'
  ];

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      jobDetails.position = element.content || element.textContent.trim();
      break;
    }
  }

  return jobDetails.companyName && jobDetails.position ? jobDetails : null;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  detectEmbeddedJobBoards();
});

// Watch for dynamic changes
const pageObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      detectEmbeddedJobBoards();
    }
  }
});

pageObserver.observe(document.body, {
  childList: true,
  subtree: true
});

