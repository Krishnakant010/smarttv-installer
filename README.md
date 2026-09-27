# SmartTV Sideload Installer

> **Universal desktop GUI & headless CLI sideloading utility for Samsung Smart TVs (Tizen OS) and LG Smart TVs (webOS).**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Platform: Linux | macOS | Windows](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)](#)
[![TV OS: Samsung Tizen | LG webOS](https://img.shields.io/badge/TV%20OS-Samsung%20Tizen%20%7C%20LG%20webOS-green.svg)](#)

---

## ✨ Features

- **Universal TV Support**: Sideload onto **Samsung Tizen** (`.wgt`, `.tpk`) and **LG webOS** (`.ipk`) Smart TVs.
- **Zero Heavy SDK Dependencies**: No need to install gigabytes of Tizen Studio or LG webOS SDKs.
- **Automated Samsung Developer Signing**:
  - Connects directly to Samsung Developer Bridge (port `26101`).
  - Reads TV Device Unique ID (DUID) automatically.
  - Automated Samsung OAuth certificate flow with persistent certificate caching.
  - In-memory package re-signing with `node-forge` and `jszip`.
- **Dynamic Package Inspection**:
  - Drag & drop any `.wgt` or `.ipk` package to instantly view App Name, Package ID, Application ID, and minimum required OS version.
- **Community Presets & GitHub Release Fetcher**:
  - One-click installation from presets:
    - **Nuvio Native Legacy** (`iqui27/nuvio-native-legacy`) — High-performance native C/WASM client.
    - **Nuvio TV Smart** (`NuvioMedia/NuvioTVSmart`) — Web-based client.
    - **TizenBrew** (`reisxd/TizenBrew`) — Open homebrew launcher.
  - Or enter any arbitrary GitHub `owner/repo` to fetch and install releases.
- **Dual Interfaces**:
  - **Modern Electron GUI**: Clean dark glassmorphic UI with drag-and-drop and live logs.
  - **Headless CLI**: Scriptable, fast terminal interface for CI/CD or power users.

---

## 📺 Television Setup (Developer Mode)

### Samsung Smart TV (Tizen 4.0+)
1. Turn on your Samsung TV and open the **Apps** panel.
2. Using the remote control, press **`1` `2` `3` `4` `5`** in sequence.
3. In the Developer Mode popup:
   - Turn **Developer Mode** to **ON**.
   - In **Host PC IP**, enter the local IPv4 address of your computer (the installer displays this for you).
4. Select **OK**.
5. **Reboot the TV completely**: Press and hold the remote's **Power** button for ~4 seconds until the TV turns off and reboots with the Samsung logo.

### LG Smart TV (webOS 3.0+)
1. Install the official **Developer Mode** app from the LG Content Store.
2. Open Developer Mode on the TV and turn **Dev Mode Status** to **ON**.
3. Note the displayed **TV IP address** and **Passphrase**.

---

## 🚀 Quick Start

### 1. Installation & Setup
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
# Sideload default preset (Nuvio Native Legacy) onto Samsung TV:
node cli.js --ip 192.168.1.50

# Sideload arbitrary local .wgt package:
node cli.js --ip 192.168.1.50 --file /path/to/app.wgt

# Sideload arbitrary local .ipk package onto LG TV:
node cli.js --ip 192.168.1.60 --file /path/to/app.ipk

# Fetch and install latest release from any GitHub repository:
node cli.js --ip 192.168.1.50 --repo reisxd/TizenBrew --tag latest
```

---

## 📦 Building Standalone Binaries

Package self-contained standalone installers for Windows, Linux, and macOS:

```bash
# Linux (AppImage & unpacked dir)
npm run dist:linux

# Windows (.exe portable)
npm run dist:win

# macOS (.app dir)
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
- **[iqui27](https://github.com/iqui27/nuvio-native-legacy)**: Creator of `nuvio-native-legacy`, the high-performance native C / SDL2 / WASM TV client.
- **[Krishnakant Gangurde](https://github.com/Krishnakant010)**: Universal fork author, dynamic package inspection engine (WGT/IPK), custom repository release fetcher, and de-coupled sideloading architecture.
