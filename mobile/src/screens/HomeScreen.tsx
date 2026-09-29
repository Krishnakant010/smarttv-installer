import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import {Header} from '../components/Header';
import {PlatformCard} from '../components/PlatformCard';
import {PresetSelector} from '../components/PresetSelector';
import {ConsoleLog} from '../components/ConsoleLog';
import {COMMUNITY_PRESETS, PresetApp} from '../config/presets';
import {resolveReleasePackage} from '../services/github';
import {resignTizenPackage} from '../services/tizenCert';
import {SdbClient} from '../services/sdbClient';
import {WebosClient} from '../services/webosClient';

export const HomeScreen: React.FC = () => {
  const [platform, setPlatform] = useState<'samsung' | 'lg'>('samsung');
  const [tvIp, setTvIp] = useState('192.168.1.50');
  const [lgPassphrase, setLgPassphrase] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PresetApp>(COMMUNITY_PRESETS[0]);
  const [customRepo, setCustomRepo] = useState('');
  const [useCustomRepo, setUseCustomRepo] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  const handleInstall = async () => {
    if (!tvIp.trim()) {
      Alert.alert('Validation Error', 'Please enter your Smart TV IP address.');
      return;
    }

    setIsInstalling(true);
    setLogs([]);
    addLog(`Target TV OS: ${platform === 'samsung' ? 'Samsung Tizen' : 'LG webOS'}`);
    addLog(`Target TV IP: ${tvIp.trim()}`);

    try {
      const repo = useCustomRepo && customRepo.trim() ? customRepo.trim() : selectedPreset.repo;
      addLog(`Resolving release package from GitHub (${repo})...`);

      const resolved = await resolveReleasePackage(repo, platform);
      addLog(`Found package: ${resolved.assetName} (${resolved.sizeMb} MB)`);

      addLog(`Downloading package binary from GitHub CDN...`);
      const resp = await fetch(resolved.downloadUrl);
      if (!resp.ok) {
        throw new Error(`Failed to download binary: HTTP ${resp.status}`);
      }
      const rawBuffer = await resp.arrayBuffer();
      addLog(`Download complete (${Math.round(rawBuffer.byteLength / 1024)} KB in memory).`);

      if (platform === 'samsung') {
        const sdb = new SdbClient(tvIp.trim());
        const tvDuid = await sdb.connectAndGetDuid(addLog);

        addLog(`Initiating in-memory cryptographic re-signing for DUID: ${tvDuid}...`);
        const {signedWgt, meta} = await resignTizenPackage(rawBuffer, tvDuid, addLog);
        addLog(`Successfully signed package for: ${meta.appName} (${meta.packageId})`);

        addLog(`Pushing signed package to Samsung TV over port 26101...`);
        await sdb.installPackage(signedWgt, meta.packageId, addLog);
        addLog('🎉 Installation Complete! Application is now available in your TV Apps panel.');
      } else {
        const webos = new WebosClient(tvIp.trim(), 9922, lgPassphrase.trim() || undefined);
        addLog('Connecting to LG TV over SSH port 9922...');
        await webos.installPackage(rawBuffer, resolved.assetName.replace('.ipk', ''), addLog);
        addLog('🎉 Installation Complete! Application is now installed on your LG webOS TV.');
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message || String(err)}`);
      Alert.alert('Installation Error', err.message || String(err));
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Header />

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>1. Target Television OS</Text>
        <View style={styles.platformRow}>
          <PlatformCard
            platform="samsung"
            selected={platform === 'samsung'}
            onSelect={p => {
              setPlatform(p);
              const firstMatch = COMMUNITY_PRESETS.find(item => item.platform === 'samsung' || item.platform === 'both');
              if (firstMatch) setSelectedPreset(firstMatch);
            }}
          />
          <View style={{width: 10}} />
          <PlatformCard
            platform="lg"
            selected={platform === 'lg'}
            onSelect={p => {
              setPlatform(p);
              const firstMatch = COMMUNITY_PRESETS.find(item => item.platform === 'lg' || item.platform === 'both');
              if (firstMatch) setSelectedPreset(firstMatch);
            }}
          />
        </View>

        <Text style={[styles.sectionTitle, {marginTop: 18}]}>2. Network Connection</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>TV Local IP Address</Text>
          <TextInput
            style={styles.textInput}
            value={tvIp}
            onChangeText={setTvIp}
            placeholder="192.168.1.50"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            autoCapitalize="none"
          />
        </View>

        {platform === 'lg' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Developer Mode Passphrase (LG TV)</Text>
            <TextInput
              style={styles.textInput}
              value={lgPassphrase}
              onChangeText={setLgPassphrase}
              placeholder="e.g. 8-digit passphrase from TV screen"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
          </View>
        )}

        <Text style={[styles.sectionTitle, {marginTop: 18}]}>3. Select Application</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, !useCustomRepo && styles.toggleBtnActive]}
            onPress={() => setUseCustomRepo(false)}>
            <Text style={[styles.toggleBtnText, !useCustomRepo && styles.toggleBtnTextActive]}>
              Community Presets
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, useCustomRepo && styles.toggleBtnActive]}
            onPress={() => setUseCustomRepo(true)}>
            <Text style={[styles.toggleBtnText, useCustomRepo && styles.toggleBtnTextActive]}>
              Custom GitHub Repo
            </Text>
          </TouchableOpacity>
        </View>

        {!useCustomRepo ? (
          <PresetSelector
            platform={platform}
            selectedPresetId={selectedPreset.id}
            onSelectPreset={setSelectedPreset}
          />
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GitHub Owner/Repository</Text>
            <TextInput
              style={styles.textInput}
              value={customRepo}
              onChangeText={setCustomRepo}
              placeholder="e.g. mariotaku/moonlight-tv"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isInstalling}
          onPress={handleInstall}
          style={[styles.installButton, isInstalling && styles.installButtonDisabled]}>
          {isInstalling ? (
            <View style={styles.buttonLoadingRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.installButtonText}>Sideloading in Progress...</Text>
            </View>
          ) : (
            <Text style={styles.installButtonText}>
              🚀 Sideload to {platform === 'samsung' ? 'Samsung TV' : 'LG TV'}
            </Text>
          )}
        </TouchableOpacity>

        <ConsoleLog logs={logs} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    paddingBottom: 40,
  },
  body: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  platformRow: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#334155',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  installButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2563eb',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  installButtonDisabled: {
    backgroundColor: '#1d4ed8',
    opacity: 0.6,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
