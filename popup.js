document.addEventListener('DOMContentLoaded', function() {
  const addButton = document.getElementById('addApplication');
  const applicationList = document.getElementById('applicationList');
  const sourceFilter = document.getElementById('sourceFilter');
  const statusFilter = document.getElementById('statusFilter');

  // Load existing applications
  loadApplications();

  // Add filter listeners
  sourceFilter.addEventListener('change', loadApplications);
  statusFilter.addEventListener('change', loadApplications);

  // Add new application manually
  addButton.addEventListener('click', function() {
    const application = {
      companyName: document.getElementById('companyName').value,
      position: document.getElementById('position').value,
      applicationUrl: document.getElementById('applicationUrl').value,
      status: document.getElementById('status').value,
      notes: document.getElementById('notes').value,
      date: new Date().toISOString(),
      autoDetected: false
    };

    if (!application.companyName) {
      alert('Please enter a company name');
      return;
    }

    chrome.storage.local.get(['applications'], function(result) {
      const applications = result.applications || [];
      applications.push(application);
      
      chrome.storage.local.set({ applications: applications }, function() {
        loadApplications();
        clearForm();
        updateStats();
      });
    });
  });

  // Load and filter applications
  function loadApplications() {
    chrome.storage.local.get(['applications'], function(result) {
      const applications = result.applications || [];
      const sourceFilterValue = sourceFilter.value;
      const statusFilterValue = statusFilter.value;
      
      const filteredApplications = applications.filter(app => {
        const sourceMatch = !sourceFilterValue || (app.source && app.source.includes(sourceFilterValue));
        const statusMatch = !statusFilterValue || app.status === statusFilterValue;
        return sourceMatch && statusMatch;
      });

      applicationList.innerHTML = '';
      
      filteredApplications.forEach((app, index) => {
        const appElement = document.createElement('div');
        appElement.className = `application-item ${app.autoDetected ? 'auto-detected' : ''}`;
        
        appElement.innerHTML = `
          <div class="delete-btn" data-index="${index}">×</div>
          <strong>${app.companyName}</strong><br>
          ${app.position}<br>
          Status: <select class="status-select" data-index="${index}">
            <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied</option>
            <option value="interviewing" ${app.status === 'interviewing' ? 'selected' : ''}>Interviewing</option>
            <option value="offered" ${app.status === 'offered' ? 'selected' : ''}>Offered</option>
            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select><br>
          ${app.source ? `Source: ${app.source}<br>` : ''}
          ${app.applicationUrl ? `<a href="${app.applicationUrl}" target="_blank">Application Link</a><br>` : ''}
          ${app.notes ? `Notes: ${app.notes}<br>` : ''}
          Date: ${new Date(app.date).toLocaleDateString()}
          ${app.autoDetected ? '<br><small>(Auto-detected)</small>' : ''}
        `;
        
        applicationList.appendChild(appElement);
      });

      // Add delete handlers
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = this.getAttribute('data-index');
          deleteApplication(index);
        });
      });

      // Add status change handlers
      document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', function() {
          const index = this.getAttribute('data-index');
          updateApplicationStatus(index, this.value);
        });
      });

      updateStats();
    });
  }

  // Update application status
  function updateApplicationStatus(index, newStatus) {
    chrome.storage.local.get(['applications'], function(result) {
      const applications = result.applications || [];
      applications[index].status = newStatus;
      
      chrome.storage.local.set({ applications: applications }, function() {
        updateStats();
      });
    });
  }

  // Delete application
  function deleteApplication(index) {
    chrome.storage.local.get(['applications'], function(result) {
      const applications = result.applications || [];
      applications.splice(index, 1);
      
      chrome.storage.local.set({ applications: applications }, function() {
        loadApplications();
        updateStats();
      });
    });
  }

  // Update statistics
  function updateStats() {
    chrome.storage.local.get(['applications'], function(result) {
      const applications = result.applications || [];
      
      const totalApps = applications.length;
      const activeApps = applications.filter(app => 
        ['applied', 'interviewing'].includes(app.status)
      ).length;
      const responseCount = applications.filter(app =>
        ['interviewing', 'offered', 'rejected'].includes(app.status)
      ).length;
      
      const responseRate = totalApps ? 
        Math.round((responseCount / totalApps) * 100) : 0;

      document.getElementById('totalApplications').textContent = totalApps;
      document.getElementById('activeApplications').textContent = activeApps;
      document.getElementById('responseRate').textContent = `${responseRate}%`;
    });
  }

  // Clear form after adding application
  function clearForm() {
    document.getElementById('companyName').value = '';
    document.getElementById('position').value = '';
    document.getElementById('applicationUrl').value = '';
    document.getElementById('status').value = 'applied';
    document.getElementById('notes').value = '';
  }

  // Clear notification badge when popup opens
  chrome.action.setBadgeText({ text: '' });
});

