# Credits & Acknowledgements

SmartTV Installer is built on the shoulders of giants. We express our deepest gratitude and recognition to the developers, projects, and communities whose open-source work made this universal tool possible:

---

### 1. NuvioMedia — [NuvioTVSmart-Installer](https://github.com/NuvioMedia/NuvioTVSmart-Installer)
* **Author / Organization:** [NuvioMedia](https://github.com/NuvioMedia)
* **Contribution:** The core architecture, Electron desktop user interface, ADB/SDB transport bridges, and initial workflow for seamless Smart TV package deployment.

---

### 2. Reis Can (`reisxd`) — [tizen.js](https://github.com/reisxd/tizen.js) & [TizenBrew](https://github.com/reisxd/TizenBrew)
* **Author:** [Reis Can (`reisxd`)](https://github.com/reisxd)
* **Contribution:** Pioneering research and open-source implementation of `tizen.js`, including `SamsungCertificateCreator`, XML C14N canonicalization, and package resigning without requiring the official 5 GB Samsung Tizen Studio IDE.

---

### 3. LG webOS Open Source & `@webos-tools/cli`
* **Organization:** [LG Electronics](https://www.webosose.org/)
* **Contribution:** The official CLI tooling (`ares-novacom`, `ares-install`, `ares-launch`) used for communicating with webOS TVs in Developer Mode.

---

### 4. webOSBrew Team — [webOS Homebrew Channel](https://github.com/webosbrew)
* **Organization:** [webOSBrew](https://github.com/webosbrew)
* **Contribution:** Pioneering open-source homebrew application ecosystem and package repository for LG webOS Smart TVs.

---

### 5. `iqui27` — [nuvio-native-legacy](https://github.com/iqui27/nuvio-native-legacy)
* **Author:** [iqui27](https://github.com/iqui27)
* **Contribution:** Development of the native C/SDL2/WASM legacy TV application which highlighted the need for a truly generic, package-agnostic TV sideloading utility for the community.

---

### 5. Open Source Libraries
We also thank the authors and maintainers of the foundational Node.js libraries:
* **`adbhost`**: Pure JavaScript ADB client implementation for connecting to port 26101 on Tizen.
* **`node-forge`**: Cryptographic implementation of PKCS#12, X.509, and RSA signing.
* **`jszip`**: Reading, modifying, and repacking `.wgt` (zip) widget archives.
* **`@xmldom/xmldom`**: Parsing and manipulating XML manifests (`config.xml`, `tizen-manifest.xml`, `appinfo.json`).
* **`electron` & `electron-builder`**: Cross-platform desktop runtime and packager.

---

### License
SmartTV Installer is distributed under the GNU General Public License v3.0 (GPL-3.0), respecting the licenses of its upstream components.
