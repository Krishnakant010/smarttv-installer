const state = {
  os: null, // 'samsung' | 'lg' | 'multi'
  mode: null, // 'simple' | 'custom'
  view: 'os' // 'os' | 'mode' | 'installer'
};

// Elements
const views = {
  os: document.getElementById('view-os'),
  mode: document.getElementById('view-mode'),
  installer: document.getElementById('view-installer')
};

const navBack = document.getElementById('nav-back');
const osCards = document.querySelectorAll('#view-os .select-card');
const btnMultiOs = document.getElementById('btn-multi-os');
const modeCards = document.querySelectorAll('#view-mode .select-card');

// Installer Elements
const instTitle = document.getElementById('inst-title');
const instSubtitle = document.getElementById('inst-subtitle');
const instBadge = document.getElementById('inst-badge');
const releaseFields = document.getElementById('release-fields');
const presetSelect = document.getElementById('presetSelect');
const customRepoRow = document.getElementById('custom-repo-row');
const customRepoInput = document.getElementById('customRepoInput');
const btnFetchRepo = document.getElementById('btn-fetch-repo');
const releaseVersionInput = document.getElementById('releaseVersion');
const releaseStatus = document.getElementById('release-status');

const lgFields = document.getElementById('lg-fields');
const lgDevicePicker = document.getElementById('lgDevicePicker');
const btnDeleteLgDevice = document.getElementById('btn-delete-lg-device');

const customFields = document.getElementById('custom-fields');
const packageDropZone = document.getElementById('package-drop-zone');
const btnBrowseInline = document.getElementById('btn-browse-inline');
const packagePathInput = document.getElementById('packagePath');
const packageInfoCard = document.getElementById('package-info-card');
const pkgPlatformBadge = document.getElementById('pkg-platform-badge');
const pkgAppName = document.getElementById('pkg-app-name');
const pkgAppId = document.getElementById('pkg-app-id');
const pkgPkgId = document.getElementById('pkg-pkg-id');
const pkgVersion = document.getElementById('pkg-version');
const pkgFilename = document.getElementById('pkg-filename');
const btnChangePackage = document.getElementById('btn-change-package');

const samsungCertOptions = document.getElementById('samsung-cert-options');
const autoGenerateCert = document.getElementById('autoGenerateCert');
const manualCertFields = document.getElementById('manual-cert-fields');
const osNotice = document.getElementById('os-notice');
const osNoticeText = document.getElementById('os-notice-text');
const btnBrowseAuthor = document.getElementById('btn-browse-author');
const btnBrowseDistributor = document.getElementById('btn-browse-distributor');
const btnInstall = document.getElementById('btn-install');
const btnCopyLog = document.getElementById('btn-copy-log');
const btnClearLog = document.getElementById('btn-clear-log');
const authorCertPathInput = document.getElementById('authorCertPath');
const distributorCertPathInput = document.getElementById('distributorCertPath');
const certPasswordInput = document.getElementById('certPassword');
const certProfileNameInput = document.getElementById('certProfileName');
const logOutput = document.getElementById('log-output');

// Credits Modal Elements
const creditsModal = document.getElementById('credits-modal');
const btnOpenCredits = document.getElementById('btn-open-credits');
const btnCloseCredits = document.getElementById('btn-close-credits');

let localIps = [];
let showHostPcIp = false;
let actionInProgress = false;
let lgDevices = [];
let releaseRequestId = 0;
let lgDeviceDeleteInProgress = false;
let communityPresets = [];
let activeRepo = "iqui27/nuvio-native-legacy";

// --- Credits Modal Handlers ---
btnOpenCredits?.addEventListener('click', () => {
  creditsModal?.classList.remove('hidden');
});
btnCloseCredits?.addEventListener('click', () => {
  creditsModal?.classList.add('hidden');
});
creditsModal?.addEventListener('click', (e) => {
  if (e.target === creditsModal) {
    creditsModal.classList.add('hidden');
  }
});

// --- Data Initialization ---
async function loadInstallerData() {
  const config = await window.installer?.getConfig?.();
  localIps = config?.localIps || [];
  communityPresets = config?.presets || [];
  if (config?.repo) {
    activeRepo = config.repo;
  }
  populatePresets();
  await refreshLgDevices();
  setupInstallerUI();
}

function populatePresets() {
  if (!presetSelect) return;
  presetSelect.innerHTML = '';
  communityPresets.forEach((preset) => {
    const opt = document.createElement('option');
    opt.value = preset.repo;
    opt.textContent = `${preset.name} (${preset.platform === 'both' ? 'Samsung & LG' : preset.platform.toUpperCase()})`;
    presetSelect.appendChild(opt);
  });
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Custom GitHub Repository...';
  presetSelect.appendChild(customOpt);

  presetSelect.value = activeRepo;
}

presetSelect?.addEventListener('change', () => {
  if (presetSelect.value === 'custom') {
    customRepoRow.classList.remove('hidden');
    customRepoInput.focus();
  } else {
    customRepoRow.classList.add('hidden');
    activeRepo = presetSelect.value;
    loadRecentReleases(state.os, activeRepo);
  }
});

btnFetchRepo?.addEventListener('click', () => {
  const customVal = customRepoInput.value.trim();
  if (!customVal || !customVal.includes('/')) {
    appendLog('Please enter a valid GitHub repository in the format owner/repo (e.g. iqui27/nuvio-native-legacy).', 'error');
    return;
  }
  activeRepo = customVal;
  loadRecentReleases(state.os, activeRepo);
});

loadInstallerData();

// --- LG Device Management ---
function renderLgDevices(selectedName = lgDevicePicker.value) {
  lgDevicePicker.innerHTML = '<option value="">New or manually configured device</option>';
  lgDevices.forEach((device) => {
    const option = document.createElement('option');
    option.value = device.name;
    const deviceLabel = device.host ? `${device.name} (${device.host})` : device.name;
    option.textContent = `${deviceLabel}${device.keyReady ? '' : ' — passphrase required'}`;
    lgDevicePicker.appendChild(option);
  });
  lgDevicePicker.value = lgDevices.some((device) => device.name === selectedName) ? selectedName : '';
  updateLgDeleteButton();
}

function updateLgDeleteButton() {
  const selectedDevice = lgDevices.find((device) => device.name === lgDevicePicker.value);
  btnDeleteLgDevice.disabled = lgDeviceDeleteInProgress || !selectedDevice?.removable;
}

async function refreshLgDevices(selectedName) {
  try {
    lgDevices = await window.installer?.getLgDevices?.() || [];
    renderLgDevices(selectedName);
  } catch (error) {
    lgDevices = [];
    renderLgDevices();
    appendLog(`Unable to load saved LG devices: ${error.message || error}`, 'error');
  }
}

lgDevicePicker?.addEventListener('change', () => {
  const device = lgDevices.find((item) => item.name === lgDevicePicker.value);
  document.getElementById('deviceName').value = device?.name || '';
  document.getElementById('ip').value = device?.host || '';
  document.getElementById('lgPassphrase').value = '';
  updateLgDeleteButton();
});

btnDeleteLgDevice?.addEventListener('click', async () => {
  const device = lgDevices.find((item) => item.name === lgDevicePicker.value);
  if (!device?.removable || lgDeviceDeleteInProgress) return;

  lgDeviceDeleteInProgress = true;
  updateLgDeleteButton();
  try {
    const result = await window.installer?.deleteLgDevice?.(device.name);
    if (!result?.ok) return;

    document.getElementById('deviceName').value = '';
    document.getElementById('ip').value = '';
    document.getElementById('lgPassphrase').value = '';
    await refreshLgDevices();
  } catch (error) {
    appendLog(`Unable to delete LG device: ${error.message || error}`, 'error');
  } finally {
    lgDeviceDeleteInProgress = false;
    updateLgDeleteButton();
  }
});

// --- GitHub Release Fetching ---
async function loadRecentReleases(platform, repo = activeRepo) {
  const requestId = ++releaseRequestId;
  releaseVersionInput.disabled = true;
  releaseVersionInput.innerHTML = '<option value="">Loading GitHub releases...</option>';
  releaseStatus.textContent = `Fetching releases from ${repo}...`;

  try {
    const releases = await window.installer?.getRecentReleases?.(platform, repo) || [];
    if (requestId !== releaseRequestId) return;

    releaseVersionInput.innerHTML = '';
    releases.forEach((release, index) => {
      const option = document.createElement('option');
      option.value = String(release.id);
      const label = release.name && release.name !== release.tagName
        ? `${release.tagName} — ${release.name}`
        : release.tagName;
      option.textContent = `${index === 0 ? 'Latest: ' : ''}${label}${release.prerelease ? ' (pre-release)' : ''}`;
      releaseVersionInput.appendChild(option);
    });

    releaseVersionInput.disabled = releases.length === 0;
    releaseStatus.textContent = releases.length
      ? `Choose one of the latest ${releases.length} compatible GitHub releases for ${repo}.`
      : `No compatible ${platform === 'samsung' ? '.wgt' : '.ipk'} package was found in ${repo} releases.`;
  } catch (error) {
    if (requestId !== releaseRequestId) return;
    releaseVersionInput.innerHTML = '<option value="">Releases unavailable</option>';
    releaseStatus.textContent = error.message || String(error);
    appendLog(`Unable to load releases from ${repo}: ${error.message || error}`, 'error');
  }
}

// --- Navigation ---
function setView(newView) {
  Object.values(views).forEach((v) => v.classList.remove('active'));
  views[newView].classList.add('active');
  state.view = newView;
  
  if (newView === 'os') {
    navBack.classList.add('hidden');
  } else {
    navBack.classList.remove('hidden');
  }
}

navBack?.addEventListener('click', () => {
  if (state.view === 'installer') {
    if (state.os === 'multi') setView('os');
    else setView('mode');
  } else if (state.view === 'mode') {
    setView('os');
  }
});

// --- OS Selection ---
osCards.forEach((card) => {
  card.addEventListener('click', () => {
    state.os = card.dataset.os;
    setView('mode');
  });
});

btnMultiOs?.addEventListener('click', () => {
  state.os = 'multi';
  state.mode = 'custom';
  setupInstallerUI();
  setView('installer');
});

// --- Mode Selection ---
modeCards.forEach((card) => {
  card.addEventListener('click', () => {
    state.mode = card.dataset.mode;
    setupInstallerUI();
    setView('installer');
    if (state.mode === 'simple') {
      loadRecentReleases(state.os, activeRepo);
    }
  });
});

function setupInstallerUI() {
  const isLg = state.os === 'lg';
  const isSamsung = state.os === 'samsung';
  const isMulti = state.os === 'multi';
  const isSimple = state.mode === 'simple';
  
  // Title / Subtitle
  if (isMulti) {
    instTitle.innerText = "Universal Sideload";
    instBadge.innerText = "MULTI-OS";
  } else {
    instTitle.innerText = isSamsung ? "Samsung Tizen" : "LG WebOS";
    instBadge.innerText = isSimple ? "GITHUB" : "LOCAL";
  }
  
  instSubtitle.innerText = isSimple 
    ? "Install package directly from GitHub releases."
    : "Sideload local package (.wgt or .ipk).";

  // Notice
  osNotice.style.display = 'block';
  
  const requiresSamsungSignIn = isSimple || autoGenerateCert.checked;
  const samsungDevModeNote = `For Tizen devices, ensure Developer Mode is enabled on your TV. While enabling Developer Mode, enter this computer's IP address as the Host PC IP.${renderHostPcIpToggle()}`;
  
  if (isMulti) {
    osNoticeText.innerHTML = `<strong>Universal Mode:</strong> Drag & drop any .wgt or .ipk package. The installer will automatically inspect the metadata and handle signing. ${samsungDevModeNote}`;
  } else if (isSamsung) {
    if (requiresSamsungSignIn) {
      osNoticeText.innerHTML = `<strong>Note:</strong> ${samsungDevModeNote} A browser window will open automatically if a new developer certificate needs to be issued.`;
    } else {
      osNoticeText.innerHTML = `<strong>Note:</strong> ${samsungDevModeNote}`;
    }
  } else {
    osNoticeText.innerHTML = "<strong>Note:</strong> For LG webOS, ensure the Developer Mode app is installed from the LG Content Store and Developer Mode is switched ON.";
  }

  // Fields
  releaseFields.classList.toggle('hidden', !isSimple || isMulti);
  lgFields.classList.toggle('hidden', isSamsung && !isMulti);
  customFields.classList.toggle('hidden', isSimple);
  
  // Custom Tizen options
  samsungCertOptions.classList.toggle('hidden', isSimple || !(isSamsung || isMulti));
}

function renderHostPcIpToggle() {
  const visibleIp = localIps.length ? localIps.join(' or ') : 'Unable to detect';
  const hiddenIp = localIps.length ? '*****' : 'Unable to detect';
  const eyeIcon = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

  return `<span class="host-ip-card"><span class="host-ip-label">Host PC IP:</span><span class="host-ip-value"><code>${showHostPcIp ? visibleIp : hiddenIp}</code><button type="button" class="ip-eye-button" id="btn-host-ip-eye" aria-label="${showHostPcIp ? 'Hide' : 'Show'} computer IP" aria-pressed="${showHostPcIp}">${eyeIcon}</button></span></span>`;
}

osNotice?.addEventListener('click', (event) => {
  if (event.target?.id !== 'btn-host-ip-eye') return;
  showHostPcIp = !showHostPcIp;
  setupInstallerUI();
});

autoGenerateCert?.addEventListener('change', (e) => {
  manualCertFields.classList.toggle('hidden', e.target.checked);
  setupInstallerUI();
});

btnBrowseAuthor?.addEventListener('click', async () => {
  const file = await window.installer?.selectFile?.();
  if (file) authorCertPathInput.value = file;
});

btnBrowseDistributor?.addEventListener('click', async () => {
  const file = await window.installer?.selectFile?.();
  if (file) distributorCertPathInput.value = file;
});

// --- Package Inspection & Drop Zone ---
async function handlePackageSelected(filePath) {
  if (!filePath) return;
  packagePathInput.value = filePath;
  const parts = filePath.split(/[/\\]/);
  const fileName = parts[parts.length - 1];
  pkgFilename.textContent = fileName;

  packageDropZone.classList.add('hidden');
  packageInfoCard.classList.remove('hidden');

  try {
    const meta = await window.installer?.inspectPackage?.(filePath);
    if (!meta || meta.error) {
      pkgAppName.textContent = fileName;
      pkgAppId.textContent = 'Inspection failed';
      pkgPkgId.textContent = meta?.error || 'Unknown format';
      pkgVersion.textContent = '-';
      return;
    }

    pkgAppName.textContent = meta.appName || fileName;
    pkgAppId.textContent = meta.appId || '(none)';
    pkgPkgId.textContent = meta.packageId || '(none)';
    pkgVersion.textContent = meta.version || meta.requiredVersion || 'N/A';

    const isWebos = meta.platform === 'webos' || meta.extension === 'ipk';
    pkgPlatformBadge.textContent = isWebos ? 'LG WEBOS' : 'SAMSUNG TIZEN';
    pkgPlatformBadge.classList.toggle('badge-webos', isWebos);

    if (state.os === 'multi') {
      state.os = isWebos ? 'lg' : 'samsung';
      setupInstallerUI();
    }
    appendLog(`Inspected package: ${meta.appName} (${meta.packageId}) [${isWebos ? 'webOS' : 'Tizen'}]`, 'info');
  } catch (err) {
    appendLog(`Package inspection error: ${err.message || err}`, 'error');
  }
}

btnBrowseInline?.addEventListener('click', async () => {
  const file = await window.installer?.selectFile?.();
  if (file) handlePackageSelected(file);
});

btnChangePackage?.addEventListener('click', async () => {
  const file = await window.installer?.selectFile?.();
  if (file) {
    handlePackageSelected(file);
  } else {
    packagePathInput.value = '';
    packageInfoCard.classList.add('hidden');
    packageDropZone.classList.remove('hidden');
  }
});

// Drag and drop events
if (packageDropZone) {
  ['dragenter', 'dragover'].forEach((eventName) => {
    packageDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      packageDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    packageDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      packageDropZone.classList.remove('dragover');
    });
  });

  packageDropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handlePackageSelected(files[0].path);
    }
  });

  packageDropZone.addEventListener('click', async (e) => {
    if (e.target !== btnBrowseInline) {
      const file = await window.installer?.selectFile?.();
      if (file) handlePackageSelected(file);
    }
  });
}

// --- Log Formatting ---
function appendLog(text, type = 'info') {
  const div = document.createElement('div');
  div.className = `log-line log-${type}`;
  div.innerText = text;
  logOutput.appendChild(div);
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setActionInProgress(inProgress, action = 'install') {
  actionInProgress = inProgress;
  btnInstall.disabled = inProgress;
  document.getElementById('btn-launch').disabled = inProgress;
  document.getElementById('btn-uninstall').disabled = inProgress;
  btnInstall.classList.toggle('is-loading', inProgress);
  btnInstall.setAttribute('aria-busy', String(inProgress));
  const loadingLabel = action === 'uninstall' ? 'Uninstalling...' : action === 'launch' ? 'Launching...' : 'Installing...';
  btnInstall.innerHTML = inProgress
    ? `<span class="button-spinner" aria-hidden="true"></span><span>${loadingLabel}</span>`
    : 'Install';
}

window.installer?.onLog?.((payload) => {
  let type = 'info';
  if (payload.type === 'error' || payload.type === 'stderr') type = 'error';
  if (payload.type === 'success') type = 'success';
  if (payload.type === 'command') type = 'command';
  appendLog(payload.text, type);
});

btnCopyLog?.addEventListener('click', async () => {
  const logText = Array.from(logOutput.querySelectorAll('.log-line'))
    .map((line) => line.innerText)
    .join('\n');
  if (!logText.trim()) return;

  const originalLabel = btnCopyLog.getAttribute('aria-label');
  try {
    const copied = await window.installer?.copyText?.(logText);
    if (!copied) throw new Error('Clipboard copy failed.');
    btnCopyLog.classList.add('copied');
    btnCopyLog.setAttribute('aria-label', 'Log copied');
    btnCopyLog.setAttribute('title', 'Copied');
  } catch (error) {
    btnCopyLog.setAttribute('aria-label', 'Copy failed');
    btnCopyLog.setAttribute('title', 'Copy failed');
    appendLog(`Unable to copy log: ${error.message || error}`, 'error');
  } finally {
    setTimeout(() => {
      btnCopyLog.classList.remove('copied');
      btnCopyLog.setAttribute('aria-label', originalLabel || 'Copy installation log');
      btnCopyLog.setAttribute('title', 'Copy log');
    }, 1400);
  }
});

btnClearLog?.addEventListener('click', () => {
  logOutput.innerHTML = '<div class="log-line log-info">Log cleared.</div>';
});

// --- Action Execution ---
async function runAction(action) {
  if (actionInProgress) return;

  const ip = document.getElementById('ip').value.trim();
  const deviceName = document.getElementById('deviceName').value.trim();
  const lgPassphrase = document.getElementById('lgPassphrase').value.trim();
  const packagePath = packagePathInput.value;
  const releaseId = releaseVersionInput.value;

  let targetOs = state.os;
  if (targetOs === 'multi') {
    if (packagePath && packagePath.toLowerCase().endsWith('.ipk')) {
      targetOs = 'lg';
    } else if (packagePath && (packagePath.toLowerCase().endsWith('.wgt') || packagePath.toLowerCase().endsWith('.tpk'))) {
      targetOs = 'samsung';
    } else {
      targetOs = lgPassphrase || deviceName ? 'lg' : 'samsung';
    }
  }

  if (targetOs === 'samsung' && !ip) {
    appendLog("Error: TV IP Address is required for Samsung TV.", "error");
    return;
  }

  if (targetOs === 'lg' && lgPassphrase && !ip) {
    appendLog("Error: TV IP Address is required to register a new LG webOS device.", "error");
    return;
  }

  if (state.mode === 'custom' && action === 'install' && !packagePath) {
    appendLog("Error: Package file (.wgt or .ipk) is required.", "error");
    return;
  }

  if (state.mode === 'simple' && action === 'install' && !releaseId) {
    appendLog("Error: Select a GitHub release version before installing.", "error");
    return;
  }

  const options = {
    ip,
    mode: state.mode,
    deviceName,
    lgPassphrase,
    packagePath,
    releaseId,
    repo: activeRepo,
    samsungCert: {
      auto: autoGenerateCert.checked,
      authorPath: authorCertPathInput.value,
      distributorPath: distributorCertPathInput.value,
      password: certPasswordInput.value,
      profileName: certProfileNameInput.value
    }
  };

  if (window.installer?.run) {
    appendLog(`Starting ${action} on ${targetOs}...`, 'info');
    setActionInProgress(true, action);
    try {
      const res = await window.installer.run(targetOs, action, options);
      if (!res.ok) {
        appendLog(`Failed: ${res.error}`, 'error');
      } else if (targetOs === 'lg' && action === 'install') {
        await refreshLgDevices(deviceName);
      }
    } finally {
      setActionInProgress(false);
    }
  }
}

btnInstall?.addEventListener('click', () => runAction('install'));
document.getElementById('btn-launch')?.addEventListener('click', () => runAction('launch'));
document.getElementById('btn-uninstall')?.addEventListener('click', () => runAction('uninstall'));
