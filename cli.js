#!/usr/bin/env node

/**
 * SmartTV Sideload Installer CLI
 * Universal command-line installer for Samsung Tizen & LG webOS Smart TVs.
 * 
 * Upstream attribution:
 * - NuvioMedia (NuvioTVSmart-Installer)
 * - Reis Can (reisxd/tizen.js)
 * - LG webOS OSE team (@webos-tools/cli)
 * - iqui27 (nuvio-native-legacy)
 * 
 * Licensed under GPL-3.0
 */

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const readline = require("readline");
const { spawn } = require("child_process");
const adbhost = require("adbhost");
const AdbPacket = require("adbhost/lib/packet.js");
const JSZip = require("jszip");
const forge = require("node-forge");
const { DOMParser } = require("@xmldom/xmldom");
const { Signature, SamsungCertificateCreator } = require("./vendor/tizen.js");

const adbCommands = AdbPacket.commands;
const CERT_DIR = path.join(os.homedir(), ".smarttv-samsung-certificates");
const LEGACY_CERT_DIR = path.join(os.homedir(), ".nuvio-samsung-certificates");
const CACHE_DIR = path.join(os.homedir(), ".smarttv-cache");
const DEFAULT_REPO = "iqui27/nuvio-native-legacy";

// Terminal colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  dim: "\x1b[2m"
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function info(msg) { log(`ℹ ${msg}`, colors.cyan); }
function success(msg) { log(`✔ ${msg}`, colors.green); }
function warn(msg) { log(`⚠ ${msg}`, colors.yellow); }
function error(msg) { log(`✖ ${msg}`, colors.red); }

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ip: "",
    file: "",
    platform: "", // "samsung" | "lg"
    repo: DEFAULT_REPO,
    tag: "",
    port: 26101,
    passphrase: ""
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--ip" || arg === "-i") {
      options.ip = args[++i];
    } else if (arg === "--file" || arg === "-f" || arg === "--wgt" || arg === "-w") {
      options.file = args[++i];
    } else if (arg === "--platform" || arg === "--os") {
      options.platform = (args[++i] || "").toLowerCase();
    } else if (arg === "--repo" || arg === "-r") {
      options.repo = args[++i];
    } else if (arg === "--tag" || arg === "-t") {
      options.tag = args[++i];
    } else if (arg === "--port" || arg === "-p") {
      options.port = parseInt(args[++i], 10);
    } else if (arg === "--passphrase") {
      options.passphrase = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (!options.ip && !arg.startsWith("-")) {
      options.ip = arg;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
${colors.bright}SmartTV Sideload Installer CLI${colors.reset}
${colors.dim}Universal sideload utility for Samsung Tizen & LG webOS Smart TVs${colors.reset}

${colors.bright}Usage:${colors.reset}
  smarttv-installer --ip <TV_IP_ADDRESS> [options]
  node cli.js --ip <TV_IP_ADDRESS> [options]

${colors.bright}Options:${colors.reset}
  --ip, -i <ip>          TV IP address (Required)
  --file, -f <path>      Local .wgt or .ipk package file path (Optional)
  --repo, -r <repo>      GitHub repository owner/repo (Default: ${DEFAULT_REPO})
  --tag, -t <tag>        GitHub release tag to fetch (Default: latest)
  --platform <os>        Target OS: 'samsung' or 'lg' (Auto-detected from file)
  --passphrase <pass>    Developer Mode passphrase (LG webOS first connection)
  --port, -p <port>      Developer Mode port for Samsung (Default: 26101)
  --help, -h             Show this help message

${colors.bright}Examples:${colors.reset}
  node cli.js --ip 192.168.1.50
  node cli.js --ip 192.168.1.50 --file ./myapp.wgt
  node cli.js --ip 192.168.1.60 --file ./myapp.ipk
  node cli.js --ip 192.168.1.50 --repo reisxd/TizenBrew --tag latest

${colors.bright}Prerequisites:${colors.reset}
  Samsung Tizen:
    1. Open TV Apps screen, press 1 2 3 4 5 on remote.
    2. Turn Developer Mode ON, set Host PC IP to this computer.
    3. Restart TV (hold remote power button until logo appears).

  LG webOS:
    1. Install "Developer Mode" from LG Content Store on TV.
    2. Turn Dev Mode ON, note Passphrase and IP.
`);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// --- Package Metadata Extraction ---
async function inspectPackage(packagePath) {
  const ext = path.extname(packagePath).toLowerCase();
  if (ext === ".wgt" || ext === ".tpk") {
    const zip = await JSZip.loadAsync(await fsp.readFile(packagePath));
    const configFile = zip.files["config.xml"];
    if (configFile) {
      const xml = await configFile.async("string");
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const application = doc.getElementsByTagName("tizen:application")[0]
        || doc.getElementsByTagNameNS("http://tizen.org/ns/widgets", "application")[0];
      const nameEl = doc.getElementsByTagName("name")[0];
      return {
        platform: "samsung",
        extension: "wgt",
        appName: (nameEl ? nameEl.textContent : "") || application?.getAttribute("package") || "Tizen App",
        packageId: application?.getAttribute("package") || "package",
        appId: application?.getAttribute("id") || application?.getAttribute("package") || "app",
        version: application?.getAttribute("required_version") || ""
      };
    }
  }

  if (ext === ".ipk") {
    return {
      platform: "lg",
      extension: "ipk",
      appName: path.basename(packagePath, ext),
      packageId: path.basename(packagePath, ext),
      appId: path.basename(packagePath, ext),
      version: ""
    };
  }

  return { platform: "unknown", packageId: "package", appId: "app", extension: "pkg" };
}

// --- GitHub Release Downloader ---
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { "User-Agent": "SmartTV-Installer-CLI/1.0" }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
  });
}

function downloadBinary(url, destPath) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { "User-Agent": "SmartTV-Installer-CLI/1.0" }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBinary(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => fileStream.close(resolve));
      fileStream.on("error", reject);
    });
    req.on("error", reject);
  });
}

async function resolveGitHubRelease(repo, tag, platform) {
  info(`Fetching release information from GitHub (${repo})...`);
  const url = tag
    ? `https://api.github.com/repos/${repo}/releases/tags/${tag}`
    : `https://api.github.com/repos/${repo}/releases/latest`;
  const release = await fetchJson(url);
  const targetExt = platform === "lg" ? ".ipk" : ".wgt";
  const asset = release.assets?.find(a => a.name.toLowerCase().endsWith(targetExt));

  if (!asset) {
    throw new Error(`No ${targetExt} package found in release "${release.tag_name || tag || "latest"}" of ${repo}.`);
  }

  await fsp.mkdir(CACHE_DIR, { recursive: true });
  const localPath = path.join(CACHE_DIR, asset.name);

  if (fs.existsSync(localPath)) {
    info(`Found cached package: ${localPath}`);
    return localPath;
  }

  info(`Downloading ${asset.name} (${(asset.size / (1024 * 1024)).toFixed(1)} MB)...`);
  await downloadBinary(asset.browser_download_url, localPath);
  success(`Downloaded package to ${localPath}`);
  return localPath;
}

// --- Samsung Tizen ADB Transport & Signing ---
function connectSamsungAdb(ip, port = 26101) {
  info(`Connecting to Samsung TV at ${ip}:${port}...`);
  return new Promise((resolve, reject) => {
    const adbClient = adbhost.createConnection({ host: ip, port });
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { adbClient._stream?.destroy(); } catch {}
        reject(new Error("Connection timed out. Check that Developer Mode is ON and Host PC IP is set."));
      }
    }, 8000);

    adbClient._stream.on("connect", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        success("Connected to Samsung TV Developer Bridge.");
        resolve(adbClient);
      }
    });

    adbClient._stream.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        try { adbClient._stream?.destroy(); } catch {}
        reject(err);
      }
    });
  });
}

function runAdbShell(adbClient, command, options = {}) {
  const timeoutMs = options.timeoutMs || 60000;
  return new Promise((resolve, reject) => {
    const stream = adbClient.createStream(`shell:${command}`);
    let output = "";
    let settled = false;
    let timer = null;

    function finish(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(output.trim());
    }

    timer = setTimeout(() => {
      finish(new Error(`Command timed out: ${command}`));
    }, timeoutMs);

    stream.on("data", (chunk) => {
      output += chunk.toString("utf8");
      if (options.completeWhen && options.completeWhen.test(output)) {
        finish();
      }
    });

    stream.on("error", finish);
    stream.on("close", () => finish());
  });
}

async function getSamsungDuid(adbClient) {
  info("Reading TV Device Unique ID (DUID)...");
  const output = await runAdbShell(adbClient, "0 getduid");
  const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const duid = lines.find(l => l.length > 5 && !l.includes(" "));
  if (!duid) {
    throw new Error(`Could not determine TV DUID from output: "${output}"`);
  }
  success(`TV DUID: ${duid}`);
  return duid;
}

function pushFileAdb(adbClient, remotePath, buffer) {
  return new Promise((resolve, reject) => {
    const shell = adbClient.createStream("sync:");
    let interval;

    function cleanup() {
      if (interval) clearInterval(interval);
    }

    shell.on("error", (err) => {
      cleanup();
      reject(err);
    });

    const sendCmd = Buffer.from("SEND");
    const mode = 0o100644;
    const pathAndMode = `${remotePath},${mode}`;
    const pathBuf = Buffer.from(pathAndMode, "utf-8");

    const header = Buffer.alloc(8);
    sendCmd.copy(header, 0);
    header.writeUInt32LE(pathBuf.length, 4);

    shell.write(header);
    shell.write(pathBuf);

    const CHUNK_SIZE = 64 * 1024;
    let offset = 0;

    interval = setInterval(() => {
      if (offset >= buffer.length) {
        cleanup();
        const doneCmd = Buffer.from("DONE");
        const doneHeader = Buffer.alloc(8);
        doneCmd.copy(doneHeader, 0);
        doneHeader.writeUInt32LE(Math.floor(Date.now() / 1000), 4);
        shell.write(doneHeader);

        shell.once("data", (response) => {
          const status = response.slice(0, 4).toString("utf-8");
          if (status === "OKAY") {
            shell.end();
            resolve();
          } else {
            shell.end();
            reject(new Error(`ADB sync failed: ${response.toString()}`));
          }
        });
        return;
      }

      const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length));
      offset += chunk.length;

      const dataCmd = Buffer.from("DATA");
      const dataHeader = Buffer.alloc(8);
      dataCmd.copy(dataHeader, 0);
      dataHeader.writeUInt32LE(chunk.length, 4);

      shell.write(dataHeader);
      shell.write(chunk);
    }, 1);
  });
}

function generateKeys() {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  return {
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
    publicKey: forge.pki.publicKeyToPem(keypair.publicKey)
  };
}

function generateAuthorCert(keys) {
  const pki = forge.pki;
  const cert = pki.createCertificate();
  cert.publicKey = pki.publicKeyFromPem(keys.publicKey);
  cert.serialNumber = "01" + crypto.randomBytes(8).toString("hex");
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: "commonName", value: "SmartTV-Installer-Author" },
    { name: "organizationName", value: "SmartTV" }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(pki.privateKeyFromPem(keys.privateKey), forge.md.sha256.create());

  return pki.certificateToPem(cert);
}

function generateCsr(keys) {
  const pki = forge.pki;
  const csr = pki.createCertificationRequest();
  csr.publicKey = pki.publicKeyFromPem(keys.publicKey);
  csr.setSubject([{ name: "commonName", value: "SmartTV-Distributor" }]);
  csr.sign(pki.privateKeyFromPem(keys.privateKey), forge.md.sha256.create());
  return pki.certificationRequestToPem(csr);
}

async function getOrCreateCertificate(duid) {
  await fsp.mkdir(CERT_DIR, { recursive: true });
  const certFile = path.join(CERT_DIR, `${duid}.json`);

  if (fs.existsSync(certFile)) {
    try {
      const data = JSON.parse(await fsp.readFile(certFile, "utf-8"));
      if (data.authorCertificate && data.distributorCertificate) {
        info("Using existing Samsung Developer Certificate for this TV.");
        return data;
      }
    } catch {}
  }

  // Also check legacy dir
  const legacyFile = path.join(LEGACY_CERT_DIR, `${duid}.json`);
  if (fs.existsSync(legacyFile)) {
    try {
      const data = JSON.parse(await fsp.readFile(legacyFile, "utf-8"));
      if (data.authorCertificate && data.distributorCertificate) {
        info("Migrated saved Samsung Developer Certificate from legacy store.");
        await fsp.writeFile(certFile, JSON.stringify(data, null, 2), "utf-8");
        return data;
      }
    } catch {}
  }

  info("\n" + "=".repeat(65));
  info("SAMSUNG ACCOUNT SIGN-IN REQUIRED FOR FIRST-TIME SETUP");
  info("=".repeat(65));
  info("Samsung requires a developer certificate for your TV DUID.");
  info("Generating RSA keypairs...");

  const authorKeys = generateKeys();
  const authorCert = generateAuthorCert(authorKeys);
  const distributorKeys = generateKeys();
  const csr = generateCsr(distributorKeys);

  const creator = new SamsungCertificateCreator();
  info("Requesting Samsung OAuth sign-in link...");
  const authUrl = await creator.openLogin(csr);

  info("\nPlease open this URL in your web browser to sign in:");
  log(`\n  ${colors.bright}${colors.cyan}${authUrl}${colors.reset}\n`);

  // Try to open browser automatically
  const openCmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  try {
    spawn(openCmd, [authUrl], { shell: true, stdio: "ignore" }).unref();
    info("Opened sign-in page in your default browser.");
  } catch {}

  info("Waiting for Samsung sign-in completion...");
  const distCert = await creator.waitForCallback(duid);
  success("Samsung Developer Certificate successfully issued!");

  const certData = {
    duid,
    authorCertificate: authorCert,
    authorPrivateKey: authorKeys.privateKey,
    distributorCertificate: distCert.certificate,
    distributorPrivateKey: distributorKeys.privateKey,
    distributorXML: distCert.xml || ""
  };

  await fsp.writeFile(certFile, JSON.stringify(certData, null, 2), "utf-8");
  return certData;
}

async function resignWgt(inputWgtPath, certConfig) {
  info("Signing package with Samsung Developer Certificate...");
  const wgtData = await fsp.readFile(inputWgtPath);
  const zip = await JSZip.loadAsync(wgtData);

  zip.remove("author-signature.xml");
  zip.remove("signature1.xml");

  const signXml = async (distributor = false) => {
    const certPem = distributor ? certConfig.distributorCertificate : certConfig.authorCertificate;
    const keyPem = distributor ? certConfig.distributorPrivateKey : certConfig.authorPrivateKey;
    const signature = new Signature(zip, certPem, keyPem, distributor ? 1 : 0);
    return signature.sign();
  };

  const authorSig = await signXml(false);
  zip.file("author-signature.xml", authorSig);

  const distSig = await signXml(true);
  zip.file("signature1.xml", distSig);

  const outputBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const outputPath = path.join(CACHE_DIR, `signed-${path.basename(inputWgtPath)}`);
  await fsp.writeFile(outputPath, outputBuffer);
  success(`Package signed successfully.`);
  return outputPath;
}

// --- Main CLI Flow ---
async function main() {
  const options = parseArgs();

  log(`\n${colors.bright}SmartTV Sideload Installer CLI${colors.reset}`);
  log(`${colors.dim}Attribution: NuvioMedia, reisxd, webOS OSE, iqui27${colors.reset}\n`);

  if (!options.ip) {
    options.ip = await prompt("Enter TV IP Address: ");
    if (!options.ip) {
      error("TV IP address is required.");
      process.exit(1);
    }
  }

  // 1. Resolve package file
  let packagePath = options.file;
  if (!packagePath) {
    // If platform is not specified, default to Samsung
    const targetPlatform = options.platform || "samsung";
    packagePath = await resolveGitHubRelease(options.repo, options.tag, targetPlatform);
  } else {
    if (!fs.existsSync(packagePath)) {
      throw new Error(`Package file not found: ${packagePath}`);
    }
  }

  // 2. Inspect package
  const meta = await inspectPackage(packagePath);
  info(`Target Application: ${meta.appName} (${meta.packageId})`);
  info(`Detected Platform: ${meta.platform === "lg" ? "LG webOS" : "Samsung Tizen"}`);

  if (meta.platform === "lg" || options.platform === "lg" || packagePath.endsWith(".ipk")) {
    // LG webOS flow
    info(`Installing on LG webOS TV (${options.ip})...`);
    const aresBin = path.join(__dirname, "node_modules", ".bin", process.platform === "win32" ? "ares-install.cmd" : "ares-install");
    if (!fs.existsSync(aresBin)) {
      throw new Error("ares-install from @webos-tools/cli is not installed. Run 'npm install'.");
    }
    const ares = spawn(aresBin, ["--device", options.ip, packagePath], { stdio: "inherit" });
    ares.on("close", (code) => {
      if (code === 0) success("\n🎉 Application installed successfully on LG webOS TV!");
      else error(`\nInstallation failed with code ${code}`);
      process.exit(code);
    });
    return;
  }

  // 3. Samsung Tizen Flow
  const adbClient = await connectSamsungAdb(options.ip, options.port);
  const duid = await getSamsungDuid(adbClient);

  // 4. Certificates
  const certConfig = await getOrCreateCertificate(duid);

  // 5. Resign WGT
  const signedWgtPath = await resignWgt(packagePath, certConfig);

  // 6. Push device-profile.xml if present
  if (certConfig.distributorXML) {
    try {
      info("Pushing Samsung device profile to TV...");
      const xmlBuffer = Buffer.from(certConfig.distributorXML, "base64");
      await pushFileAdb(adbClient, "/home/owner/share/tmp/sdk_tools/device-profile.xml", xmlBuffer);
    } catch (e) {
      warn(`Skipped device-profile.xml: ${e.message}`);
    }
  }

  // 7. Push signed WGT
  info("Uploading signed package to Samsung TV...");
  const wgtBuffer = await fsp.readFile(signedWgtPath);
  const remotePackagePath = `/home/owner/share/tmp/sdk_tools/${meta.packageId}.${meta.extension}`;
  await pushFileAdb(adbClient, remotePackagePath, wgtBuffer);
  success("Package uploaded to TV.");

  // 8. Execute vd_appinstall
  info(`Installing ${meta.packageId} on TV...`);
  const installOutput = await runAdbShell(
    adbClient,
    `0 vd_appinstall ${meta.packageId} ${remotePackagePath}`,
    { timeoutMs: 180000 }
  );

  log(`Install output: ${installOutput}`);

  if (installOutput.includes("failed") || installOutput.includes("error") || installOutput.includes("118012")) {
    throw new Error(`Installation failed on TV: ${installOutput}`);
  }

  success(`\n🎉 ${meta.appName} installed successfully on your Samsung TV!`);

  // 9. Launch prompt
  if (meta.appId) {
    const launch = await prompt(`\nDo you want to launch ${meta.appName} on your TV now? (Y/n): `);
    if (launch.toLowerCase() !== "n") {
      info(`Launching ${meta.appId}...`);
      try {
        await runAdbShell(adbClient, `0 was_start ${meta.appId}`);
        success("App launched on TV!");
      } catch (e) {
        warn(`Could not auto-launch: ${e.message}. You can open it from your TV Apps bar.`);
      }
    }
  }

  try { adbClient._stream?.destroy(); } catch {}
  process.exit(0);
}

main().catch((err) => {
  error(`\nError: ${err.message}`);
  process.exit(1);
});
