// ==========================================================================
// CLIENT CONTROLLER & REST API COUPLING - LUMINA LEAD PORTAL
// ==========================================================================

const API_BASE = '/api';

// State Object
const state = {
  campaigns: [],
  forms: [],
  leads: [],
  contacts: [],
  activeTab: 'overview',
  consoleLogs: {
    request: null,
    response: null
  }
};

// DOM References
const views = {
  overview: document.getElementById('view-overview'),
  campaigns: document.getElementById('view-campaigns'),
  simulator: document.getElementById('view-simulator'),
  leads: document.getElementById('view-leads'),
  contacts: document.getElementById('view-contacts'),
  docs: document.getElementById('view-docs')
};

const navItems = {
  overview: document.getElementById('nav-overview'),
  campaigns: document.getElementById('nav-campaigns'),
  simulator: document.getElementById('nav-simulator'),
  leads: document.getElementById('nav-leads'),
  contacts: document.getElementById('nav-contacts'),
  docs: document.getElementById('nav-docs')
};

const pageTitle = document.getElementById('page-title');
const pageDescription = document.getElementById('page-description');

// Tab Meta Configurations
const tabMeta = {
  overview: { title: 'Dashboard Overview', desc: 'System health, performance metrics, and activity highlights.' },
  campaigns: { title: 'Campaigns & Capture Forms', desc: 'Manage marketing campaigns and structure custom intake forms.' },
  simulator: { title: 'Lead Capture Simulator', desc: 'Test data validation, sanitization, and database ingestion.' },
  leads: { title: 'Leads Database', desc: 'Browse captured form entries and metadata payloads.' },
  contacts: { title: 'Unified CRM Registry', desc: 'Consolidated profiles generated automatically from unique email leads.' },
  docs: { title: 'API Documentation', desc: 'Developer reference specifications and JSON payloads.' }
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  loadAllData();
});

// Setup sidebar routing
function setupNavigation() {
  Object.keys(navItems).forEach(tab => {
    navItems[tab].addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab);
    });
  });

  // Handle URL hashes on reload
  const hash = window.location.hash.substring(1);
  if (hash && views[hash]) {
    switchTab(hash);
  }
}

function switchTab(tab) {
  state.activeTab = tab;
  window.location.hash = tab;

  // Toggle active views
  Object.keys(views).forEach(v => {
    if (v === tab) {
      views[v].classList.add('active');
    } else {
      views[v].classList.remove('active');
    }
  });

  // Toggle active nav styling
  Object.keys(navItems).forEach(n => {
    if (n === tab) {
      navItems[n].classList.add('active');
    } else {
      navItems[n].classList.remove('active');
    }
  });

  // Update header text
  pageTitle.textContent = tabMeta[tab].title;
  pageDescription.textContent = tabMeta[tab].desc;
}

// Attach Event Listeners
function setupEventListeners() {
  // Global Refresh
  document.getElementById('btn-refresh').addEventListener('click', loadAllData);

  // Console Tabs Toggling
  const tabReq = document.getElementById('tab-request');
  const tabRes = document.getElementById('tab-response');
  const consoleArea = document.getElementById('console-view-area');

  tabReq.addEventListener('click', () => {
    tabReq.classList.add('active');
    tabRes.classList.remove('active');
    renderConsole('request');
  });

  tabRes.addEventListener('click', () => {
    tabRes.classList.add('active');
    tabReq.classList.remove('active');
    renderConsole('response');
  });

  document.getElementById('btn-clear-console').addEventListener('click', () => {
    state.consoleLogs.request = null;
    state.consoleLogs.response = null;
    consoleArea.innerHTML = '<div class="console-placeholder">Console cleared. Waiting for form submission...</div>';
  });

  // Form Simulator Selection
  const formSelect = document.getElementById('sim-form-select');
  formSelect.addEventListener('change', (e) => {
    renderSimulatorForm(e.target.value);
  });

  // Form Simulator Submit
  const simulatorForm = document.getElementById('simulator-lead-form');
  simulatorForm.addEventListener('submit', handleSimulatorSubmit);

  // Modals Toggling
  setupModal('campaign-modal', 'btn-open-campaign-modal', 'btn-close-campaign-modal', 'btn-cancel-campaign-modal');
  setupModal('form-modal', 'btn-open-form-modal', 'btn-close-form-modal', 'btn-cancel-form-modal');

  // Schema Builder inside Form Modal
  document.getElementById('btn-add-schema-field').addEventListener('click', () => addSchemaFieldRow());

  // Form submits
  document.getElementById('create-campaign-form').addEventListener('submit', handleCreateCampaign);
  document.getElementById('create-form-form').addEventListener('submit', handleCreateForm);

  // Filter Leads
  document.getElementById('filter-lead-campaign').addEventListener('change', (e) => {
    renderLeads(e.target.value);
  });
}

function setupModal(modalId, openBtnId, closeBtnId, cancelBtnId) {
  const modal = document.getElementById(modalId);
  const openBtn = document.getElementById(openBtnId);
  const closeBtn = document.getElementById(closeBtnId);
  const cancelBtn = document.getElementById(cancelBtnId);

  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    if (modalId === 'form-modal') {
      // Initialize with one schema field row
      const container = document.getElementById('schema-fields-list-container');
      container.innerHTML = '';
      addSchemaFieldRow();
    }
  });

  const hideModal = () => modal.classList.add('hidden');
  closeBtn.addEventListener('click', hideModal);
  cancelBtn.addEventListener('click', hideModal);
}

// Fetch all database state
async function loadAllData() {
  const btnRefresh = document.getElementById('btn-refresh');
  btnRefresh.classList.add('fa-spin');

  try {
    const [campaignsRes, formsRes, leadsRes, contactsRes] = await Promise.all([
      fetch(`${API_BASE}/campaigns`).then(r => r.json()),
      fetch(`${API_BASE}/forms`).then(r => r.json()),
      fetch(`${API_BASE}/leads`).then(r => r.json()),
      fetch(`${API_BASE}/contacts`).then(r => r.json())
    ]);

    if (campaignsRes.success) state.campaigns = campaignsRes.data;
    if (formsRes.success) state.forms = formsRes.data;
    if (leadsRes.success) state.leads = leadsRes.data;
    if (contactsRes.success) state.contacts = contactsRes.data;

    // Render components
    renderStats();
    renderCampaignsList();
    populateSelectMenus();
    renderLeads();
    renderContacts();
    renderRecentTimeline();

  } catch (error) {
    console.error('Failed to load data from Express API:', error);
  } finally {
    setTimeout(() => btnRefresh.classList.remove('fa-spin'), 600);
  }
}

// Render Dashboard Statistics
function renderStats() {
  document.getElementById('stat-campaigns').textContent = state.campaigns.length;
  document.getElementById('stat-forms').textContent = state.forms.length;
  document.getElementById('stat-leads').textContent = state.leads.length;
  document.getElementById('stat-contacts').textContent = state.contacts.length;
}

// Render Recent Timeline on Dashboard Overview
function renderRecentTimeline() {
  const container = document.getElementById('recent-activity-list');
  if (state.leads.length === 0) {
    container.innerHTML = '<div class="timeline-empty">No activity captured yet. Submit a form in the simulator!</div>';
    return;
  }

  // Take latest 5 leads
  const latestLeads = state.leads.slice(0, 5);
  container.innerHTML = latestLeads.map(lead => {
    const dateStr = new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formName = lead.form ? lead.form.name : 'Direct Intake';
    
    return `
      <div class="activity-item">
        <div class="activity-icon capture"><i class="fa-solid fa-user-plus"></i></div>
        <div class="activity-details">
          <span class="activity-title">New Lead: <strong>${lead.firstName} ${lead.lastName || ''}</strong></span>
          <span class="activity-desc">Captured via form <em>${formName}</em>. (${lead.email})</span>
          <span class="activity-time">${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Render Campaigns & Forms Grid Lists
function renderCampaignsList() {
  const campaignsGrid = document.getElementById('campaigns-grid-list');
  const formsGrid = document.getElementById('forms-grid-list');

  // Campaigns Grid
  if (state.campaigns.length === 0) {
    campaignsGrid.innerHTML = '<div class="placeholder-box">No campaigns created yet.</div>';
  } else {
    campaignsGrid.innerHTML = state.campaigns.map(c => `
      <div class="registry-card">
        <div class="card-top">
          <span class="card-tag">Campaign</span>
          <h3 class="card-title">${c.name}</h3>
          <p class="card-description">${c.description || 'No description provided.'}</p>
        </div>
        <div class="card-bottom">
          <span class="card-meta-pill"><i class="fa-solid fa-rectangle-list"></i> ${c._count?.forms || 0} Forms</span>
          <span class="card-meta-pill"><i class="fa-solid fa-filter"></i> ${c._count?.leads || 0} Leads</span>
          <span class="status-value-pill ${c.status === 'ACTIVE' ? 'success' : 'info'}">${c.status}</span>
        </div>
      </div>
    `).join('');
  }

  // Forms Grid
  if (state.forms.length === 0) {
    formsGrid.innerHTML = '<div class="placeholder-box">No forms created yet.</div>';
  } else {
    formsGrid.innerHTML = state.forms.map(f => {
      const fieldCount = Array.isArray(f.fields) ? f.fields.length : 0;
      return `
        <div class="registry-card">
          <div class="card-top">
            <span class="card-tag">Lead Intake Form</span>
            <h3 class="card-title">${f.name}</h3>
            <p class="card-description">Linked to: <strong>${f.campaign?.name || 'Unknown'}</strong></p>
          </div>
          <div class="card-bottom">
            <span class="card-meta-pill"><i class="fa-solid fa-sliders"></i> ${fieldCount} Custom Fields</span>
            <span class="status-value-pill info" title="Form ID">${f.id.substring(0, 8)}...</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Populate select drops
function populateSelectMenus() {
  const simSelect = document.getElementById('sim-form-select');
  const campaignFormSelect = document.getElementById('form-campaign-select');
  const leadCampaignFilter = document.getElementById('filter-lead-campaign');

  // Save selection states
  const prevSimVal = simSelect.value;
  const prevFilterVal = leadCampaignFilter.value;

  // Clear options
  simSelect.innerHTML = '<option value="" disabled selected>-- Choose a Lead Capture Form --</option>';
  campaignFormSelect.innerHTML = '<option value="" disabled selected>-- Select campaign to bind form --</option>';
  leadCampaignFilter.innerHTML = '<option value="">All Campaigns</option>';

  state.forms.forEach(f => {
    simSelect.innerHTML += `<option value="${f.id}">${f.name} (${f.campaign?.name})</option>`;
  });

  state.campaigns.forEach(c => {
    campaignFormSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    leadCampaignFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });

  // Restore previous values if they still exist
  if (state.forms.some(f => f.id === prevSimVal)) simSelect.value = prevSimVal;
  if (state.campaigns.some(c => c.id === prevFilterVal)) leadCampaignFilter.value = prevFilterVal;
}

// Render Simulator Form Dynamically
function renderSimulatorForm(formId) {
  const formEl = document.getElementById('simulator-lead-form');
  const placeholder = document.getElementById('sim-no-form-placeholder');
  const customContainer = document.getElementById('sim-custom-fields-container');

  const selectedForm = state.forms.find(f => f.id === formId);
  if (!selectedForm) {
    formEl.classList.add('hidden');
    placeholder.classList.remove('hidden');
    return;
  }

  placeholder.classList.add('hidden');
  formEl.classList.remove('hidden');
  customContainer.innerHTML = '';

  const fields = selectedForm.fields;
  if (fields && fields.length > 0) {
    customContainer.innerHTML += '<div class="form-section-title">Dynamic Form Fields (Schema Required)</div>';
    
    fields.forEach(field => {
      const isRequired = field.required;
      const requiredAttr = isRequired ? 'required' : '';
      const asterisk = isRequired ? ' <span class="required-asterisk">*</span>' : '';
      
      let inputHtml = '';
      if (field.type === 'textarea') {
        inputHtml = `<textarea id="sim-custom-${field.name}" class="form-control" placeholder="Input detail" ${requiredAttr}></textarea>`;
      } else {
        const inputType = field.type === 'number' ? 'number' : 'text';
        inputHtml = `<input type="${inputType}" id="sim-custom-${field.name}" class="form-control" placeholder="Input ${field.label}" ${requiredAttr}>`;
      }

      customContainer.innerHTML += `
        <div class="form-group">
          <label for="sim-custom-${field.name}">${field.label}${asterisk}</label>
          ${inputHtml}
        </div>
      `;
    });
  }
}

// Handle Form Simulator Post
async function handleSimulatorSubmit(e) {
  e.preventDefault();

  const formId = document.getElementById('sim-form-select').value;
  const form = state.forms.find(f => f.id === formId);
  if (!form) return;

  // Gather Standard parameters
  const payload = {
    campaignId: form.campaignId,
    formId: form.id,
    firstName: document.getElementById('sim-firstName').value.trim(),
    lastName: document.getElementById('sim-lastName').value.trim() || null,
    email: document.getElementById('sim-email').value.trim(),
    phone: document.getElementById('sim-phone').value.trim() || null,
    submittedData: {}
  };

  // Gather dynamic custom parameters
  if (form.fields && form.fields.length > 0) {
    form.fields.forEach(field => {
      const inputVal = document.getElementById(`sim-custom-${field.name}`).value;
      if (inputVal !== undefined && inputVal !== '') {
        // Convert numbers if numeric field
        payload.submittedData[field.name] = field.type === 'number' ? Number(inputVal) : inputVal;
      }
    });
  }

  // 1. Log Request to console state
  state.consoleLogs.request = {
    method: 'POST',
    url: `${window.location.origin}${API_BASE}/leads/capture`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: payload
  };
  
  state.consoleLogs.response = null; // Clear old response
  switchConsoleTab('request');

  try {
    const res = await fetch(`${API_BASE}/leads/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    state.consoleLogs.response = {
      status: res.status,
      statusText: res.statusText,
      body: data
    };

    switchConsoleTab('response');

    if (res.ok) {
      // Clear standard form inputs on success
      document.getElementById('sim-firstName').value = '';
      document.getElementById('sim-lastName').value = '';
      document.getElementById('sim-email').value = '';
      document.getElementById('sim-phone').value = '';
      
      // Clear dynamic inputs
      if (form.fields && form.fields.length > 0) {
        form.fields.forEach(field => {
          document.getElementById(`sim-custom-${field.name}`).value = '';
        });
      }

      // Reload registry lists in background
      loadAllData();
    }
  } catch (err) {
    state.consoleLogs.response = {
      status: 500,
      statusText: 'Fetch Error',
      body: { success: false, message: err.message }
    };
    switchConsoleTab('response');
  }
}

function switchConsoleTab(tabType) {
  const tabReq = document.getElementById('tab-request');
  const tabRes = document.getElementById('tab-response');

  if (tabType === 'request') {
    tabReq.classList.add('active');
    tabRes.classList.remove('active');
  } else {
    tabRes.classList.add('active');
    tabReq.classList.remove('active');
  }

  renderConsole(tabType);
}

// Render formatted JSON in API console
function renderConsole(tabType) {
  const container = document.getElementById('console-view-area');
  const logData = state.consoleLogs[tabType];

  if (!logData) {
    container.innerHTML = `<div class="console-placeholder">No ${tabType} logged yet. Perform a submission.</div>`;
    return;
  }

  if (tabType === 'request') {
    container.innerHTML = `
<span class="req-badge post-badge">${logData.method}</span> <span style="color: #60a5fa">${logData.url}</span>

<strong>Headers:</strong>
${JSON.stringify(logData.headers, null, 2)}

<strong>Body JSON:</strong>
<span style="color: #38bdf8">${JSON.stringify(logData.body, null, 2)}</span>
    `.trim();
  } else {
    const isSuccess = logData.status >= 200 && logData.status < 300;
    const statusClass = isSuccess ? 'console-success-text' : 'console-error-text';
    
    container.innerHTML = `
<strong>HTTP Status Code:</strong> <span class="${statusClass}">${logData.status} ${logData.statusText}</span>

<strong>Body JSON Response:</strong>
<span style="color: ${isSuccess ? '#34d399' : '#f87171'}">${JSON.stringify(logData.body, null, 2)}</span>
    `.trim();
  }
}

// Render Lead intake table database
function renderLeads(campaignFilterId = '') {
  const body = document.getElementById('leads-table-body');
  
  let filteredLeads = state.leads;
  if (campaignFilterId) {
    filteredLeads = state.leads.filter(l => l.campaignId === campaignFilterId);
  }

  if (filteredLeads.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="text-center">No leads matching search filter.</td></tr>';
    return;
  }

  body.innerHTML = filteredLeads.map(lead => {
    const dateStr = new Date(lead.createdAt).toLocaleDateString() + ' ' + new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const campaignName = lead.campaign ? lead.campaign.name : 'Unknown Campaign';
    const formName = lead.form ? lead.form.name : 'Direct Intake';
    
    // Stringify custom payload
    const customDataPreview = lead.submittedData && Object.keys(lead.submittedData).length > 0 
      ? JSON.stringify(lead.submittedData) 
      : 'None';

    const statusPill = `<span class="badge-status ${lead.status.toLowerCase()}">${lead.status}</span>`;

    return `
      <tr>
        <td><strong>${lead.firstName} ${lead.lastName || ''}</strong></td>
        <td>${lead.email}</td>
        <td>${lead.phone || '<span style="color: var(--text-muted)">-</span>'}</td>
        <td>
          <div style="font-size: 13px; font-weight: 600;">${campaignName}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${formName}</div>
        </td>
        <td><div class="json-inline-preview" title='${customDataPreview}'>${customDataPreview}</div></td>
        <td>${statusPill}</td>
        <td style="font-size: 12px; color: var(--text-secondary)">${dateStr}</td>
      </tr>
    `;
  }).join('');
}

// Render CRM Contacts
function renderContacts() {
  const body = document.getElementById('contacts-table-body');

  if (state.contacts.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="text-center">No contact profiles created yet.</td></tr>';
    return;
  }

  body.innerHTML = state.contacts.map(c => {
    const dateStr = new Date(c.updatedAt).toLocaleDateString() + ' ' + new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialLetter = c.firstName ? c.firstName.charAt(0).toUpperCase() : 'C';

    return `
      <tr>
        <td>
          <div class="contact-name-group">
            <div class="contact-avatar">${initialLetter}</div>
            <strong>${c.firstName} ${c.lastName || ''}</strong>
          </div>
        </td>
        <td>${c.email}</td>
        <td>${c.phone || '<span style="color: var(--text-muted)">-</span>'}</td>
        <td><code style="font-size: 11px; color: var(--accent-hover)">${c.leadId ? c.leadId.substring(0, 18) + '...' : '-'}</code></td>
        <td><span style="font-size: 13px; color: var(--text-secondary)">${c.notes || '-'}</span></td>
        <td style="font-size: 12px; color: var(--text-secondary)">${dateStr}</td>
      </tr>
    `;
  }).join('');
}

// Add Custom Schema Field Row in Form Modal Builder
let fieldCounter = 0;
function addSchemaFieldRow() {
  const container = document.getElementById('schema-fields-list-container');
  const rowId = `schema-field-row-${fieldCounter++}`;
  
  const rowHtml = `
    <div class="schema-field-row" id="${rowId}">
      <input type="text" placeholder="Field Key (e.g. company)" class="form-control field-key" required>
      <input type="text" placeholder="Label (e.g. Company Name)" class="form-control field-label" required>
      <select class="form-control field-type">
        <option value="text">Text</option>
        <option value="email">Email</option>
        <option value="number">Number</option>
        <option value="textarea">Text Area</option>
      </select>
      <label class="checkbox-label">
        <input type="checkbox" class="field-required"> Req?
      </label>
      <button type="button" class="btn-remove-field" onclick="document.getElementById('${rowId}').remove()" title="Delete Field">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', rowHtml);
}

// Handle POST Campaign Create
async function handleCreateCampaign(e) {
  e.preventDefault();

  const payload = {
    name: document.getElementById('campaign-name').value.trim(),
    description: document.getElementById('campaign-desc').value.trim() || null,
    status: document.getElementById('campaign-status').value
  };

  try {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      document.getElementById('create-campaign-form').reset();
      document.getElementById('campaign-modal').classList.add('hidden');
      loadAllData();
    } else {
      alert(`Error creating campaign: ${data.message || JSON.stringify(data.errors)}`);
    }
  } catch (err) {
    alert(`Request error: ${err.message}`);
  }
}

// Handle POST Form Create
async function handleCreateForm(e) {
  e.preventDefault();

  const campaignId = document.getElementById('form-campaign-select').value;
  const name = document.getElementById('form-name').value.trim();

  // Read schema rows
  const rows = document.querySelectorAll('.schema-field-row');
  const fields = [];

  rows.forEach(row => {
    const key = row.querySelector('.field-key').value.trim();
    const label = row.querySelector('.field-label').value.trim();
    const type = row.querySelector('.field-type').value;
    const required = row.querySelector('.field-required').checked;

    if (key && label) {
      fields.push({ name: key, label, type, required });
    }
  });

  if (fields.length === 0) {
    alert('Please add at least one form schema field.');
    return;
  }

  const payload = {
    campaignId,
    name,
    fields
  };

  try {
    const res = await fetch(`${API_BASE}/forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      document.getElementById('create-form-form').reset();
      document.getElementById('form-modal').classList.add('hidden');
      loadAllData();
    } else {
      alert(`Error creating form: ${data.message || JSON.stringify(data.errors)}`);
    }
  } catch (err) {
    alert(`Request error: ${err.message}`);
  }
}
