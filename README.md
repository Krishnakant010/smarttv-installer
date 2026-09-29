# SmartTV Sideload Installer

> **Universal desktop GUI & headless CLI sideloading utility for LG Smart TVs (webOS) and Samsung Smart TVs (Tizen OS).**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Platform: Linux | Windows | macOS](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)](#)
[![TV OS: LG webOS | Samsung Tizen](https://img.shields.io/badge/TV%20OS-LG%20webOS%20%7C%20Samsung%20Tizen-green.svg)](#)
[![Release Builds](https://github.com/Krishnakant010/smarttv-installer/actions/workflows/release.yml/badge.svg)](https://github.com/Krishnakant010/smarttv-installer/actions/workflows/release.yml)

---

## 📥 Downloads

Pre-built binaries for **Windows** and **Linux** are automatically built and published on every release:

👉 **[Download the Latest Release on GitHub](https://github.com/Krishnakant010/smarttv-installer/releases/latest)**

| Platform | Format | Description |
| :--- | :--- | :--- |
| **Windows** | `.exe` (Portable) | Single standalone executable, no installation needed |
| **Windows** | `.exe` (Setup) | Standard Windows installer with desktop shortcuts |
| **Linux** | `.AppImage` | Universal Linux standalone executable (Ubuntu, Fedora, Arch, etc.) |
| **Linux** | `.deb` | Debian / Ubuntu installer package |

---

## ✨ Features

- **Universal TV Support**: Full first-class sideloading for both **LG webOS** (`.ipk`) and **Samsung Tizen** (`.wgt`, `.tpk`) Smart TVs.
- **Zero Heavy SDK Dependencies**: No need to manually download or configure gigabytes of Tizen Studio or LG webOS CLI/SDK suites.
- **Seamless LG webOS Integration**:
  - Automatically manages registered webOS device profiles.
  - One-click SSH key retrieval and pairing via Dev Mode Passphrase.
  - Sideload, launch, and uninstall apps directly over local network.
- **Automated Samsung Developer Signing**:
  - Connects directly to Samsung Developer Bridge (port `26101`).
  - Reads TV Device Unique ID (DUID) automatically.
  - Automated Samsung OAuth certificate flow with persistent certificate caching.
  - In-memory package re-signing with `node-forge` and `jszip`.
- **Dynamic Package Inspection**:
  - Drag & drop any `.wgt` or `.ipk` package to instantly view App Name, Package ID, Application ID, and minimum required OS version.
- **Platform-Filtered Community Presets**:
  - **LG webOS**:
    - **webOS Homebrew Channel** (`webosbrew/webos-homebrew-channel`) — Premier homebrew store and package manager for LG TVs.
    - **YouTube for webOS** (`webosbrew/youtube-webos`) — Ad-free YouTube client for LG webOS.
    - **Moonlight TV** (`mariotaku/moonlight-tv`) — High-performance game streaming client.
  - **Samsung Tizen**:
    - **TizenBrew** (`reisxd/TizenBrew`) — Open homebrew launcher and shell.
    - **Moonlight TV** (`mariotaku/moonlight-tv`) — High-performance game streaming client.
    - **NuvioX (Watch Party Edition)** (`Krishnakant010/nuvio-watchparty`) — 4K UHD & Watch Party sync client.
  - **Custom GitHub Repository**: Enter any arbitrary GitHub `owner/repo` to fetch and install compatible releases directly.
- **Dual Interfaces**:
  - **Modern Electron GUI**: Clean dark glassmorphic UI with drag-and-drop, dynamic OS switching, and real-time logs.
  - **Headless CLI**: Scriptable, ultra-fast terminal interface for automation, power users, and headless servers.

---

## 📺 Television Setup (Developer Mode)

### LG Smart TV (webOS 3.0+)
1. Install the official **Developer Mode** app from the LG Content Store.
2. Open **Developer Mode** on your TV and toggle **Dev Mode Status** to **ON**.
3. Note the displayed **TV IP address** and **Passphrase**.
4. In the installer, enter your TV IP and Passphrase to pair automatically.

### Samsung Smart TV (Tizen 4.0+)
1. Turn on your Samsung TV and open the **Apps** panel.
2. Using the remote control, press **`1` `2` `3` `4` `5`** in sequence.
3. In the Developer Mode popup:
   - Turn **Developer Mode** to **ON**.
   - In **Host PC IP**, enter the local IPv4 address of your computer (the installer displays this for you).
4. Select **OK**.
5. **Reboot the TV completely**: Press and hold the remote's **Power** button for ~4 seconds until the TV turns off and reboots with the Samsung logo.

---

## 🚀 Quick Start

### 1. Installation & Development Setup
```bash
git clone https://github.com/Krishnakant010/smarttv-installer.git
cd smarttv-installer
npm install
```

### 2. Run the Desktop GUI
```bash
npm start
```

### 3. Run the Command-Line Interface (CLI)
```bash
# --- LG webOS ---
# Pair and install the webOS Homebrew Channel preset:
node cli.js --ip 192.168.1.60 --platform lg --passphrase YOUR_DEV_PASSPHRASE

# Sideload a local .ipk file onto LG TV:
node cli.js --ip 192.168.1.60 --file /path/to/app.ipk

# --- Samsung Tizen ---
# Install the TizenBrew preset onto Samsung TV:
node cli.js --ip 192.168.1.50 --platform samsung

# Sideload a local .wgt file onto Samsung TV:
node cli.js --ip 192.168.1.50 --file /path/to/app.wgt

# --- Custom GitHub Releases ---
# Fetch and install any GitHub repository release:
node cli.js --ip 192.168.1.60 --platform lg --repo mariotaku/moonlight-tv --tag latest
```

---

## 📦 Building Standalone Binaries Locally

Package self-contained standalone installers:

```bash
# Linux (AppImage)
npm run dist:linux

# Windows (Portable & Setup .exe)
npm run dist:win

# macOS (.app directory)
npm run dist:mac
```

---

## ⚖️ License & Attribution

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0-only)**.

### Credits & Upstream Authors
See [CREDITS.md](CREDITS.md) for full details and licenses.

- **[NuvioMedia / NuvioTVSmart-Installer](https://github.com/NuvioMedia/NuvioTVSmart-Installer)**: Original upstream installer application architecture, LG device management, and Samsung certificate persistence.
- **[Reis Can (reisxd)](https://github.com/reisxd)**: Author of `tizen.js` and `TizenBrew`, providing pure Node.js Samsung Developer OAuth certificate generation and ADB sync sideload transport.
- **[LG webOS OSE Team](https://www.webosose.org/)**: Maintainers of `@webos-tools/cli` and `ares-*` command-line tools.
- **[iqui27](https://github.com/iqui27/nuvio-native-legacy)**: Creator of `nuvio-native-legacy`, high-performance native C / SDL2 / WASM TV client.
- **[webOSBrew Team](https://github.com/webosbrew)**: Open-source homebrew ecosystem for LG webOS TVs.
- **[Krishnakant Gangurde](https://github.com/Krishnakant010)**: Universal SmartTV installer fork author, dynamic multi-OS package inspection engine (WGT/IPK), custom repository release fetcher, CI/CD automated release pipeline, and de-coupled sideloading architecture.
