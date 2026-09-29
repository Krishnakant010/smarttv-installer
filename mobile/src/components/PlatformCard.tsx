import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

interface PlatformCardProps {
  platform: 'samsung' | 'lg';
  selected: boolean;
  onSelect: (platform: 'samsung' | 'lg') => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({
  platform,
  selected,
  onSelect,
}) => {
  const isSamsung = platform === 'samsung';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect(platform)}
      style={[
        styles.card,
        selected && (isSamsung ? styles.selectedSamsung : styles.selectedLg),
      ]}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{isSamsung ? '📺' : '🖥️'}</Text>
        <View
          style={[
            styles.radio,
            selected && (isSamsung ? styles.radioSelectedSamsung : styles.radioSelectedLg),
          ]}>
          {selected && <View style={styles.radioInner} />}
        </View>
      </View>
      <Text style={styles.name}>{isSamsung ? 'Samsung TV' : 'LG webOS TV'}</Text>
      <Text style={styles.format}>{isSamsung ? 'Tizen OS (.wgt / .tpk)' : 'webOS (.ipk)'}</Text>
      <Text style={styles.portInfo}>{isSamsung ? 'TCP Port 26101 (SDB)' : 'SSH Port 9922'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  selectedSamsung: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e2a4a',
  },
  selectedLg: {
    borderColor: '#e11d48',
    backgroundColor: '#3b1828',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelectedSamsung: {
    borderColor: '#3b82f6',
  },
  radioSelectedLg: {
    borderColor: '#e11d48',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  format: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  portInfo: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
  },
});
