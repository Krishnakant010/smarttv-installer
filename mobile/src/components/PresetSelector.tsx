import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {COMMUNITY_PRESETS, PresetApp} from '../config/presets';

interface PresetSelectorProps {
  platform: 'samsung' | 'lg';
  selectedPresetId: string;
  onSelectPreset: (preset: PresetApp) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  platform,
  selectedPresetId,
  onSelectPreset,
}) => {
  const filteredPresets = COMMUNITY_PRESETS.filter(
    p => p.platform === 'both' || p.platform === platform
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Select App to Install</Text>
      <View style={styles.list}>
        {filteredPresets.map(preset => {
          const isSelected = preset.id === selectedPresetId;
          return (
            <TouchableOpacity
              key={preset.id}
              activeOpacity={0.7}
              onPress={() => onSelectPreset(preset)}
              style={[styles.presetCard, isSelected && styles.presetCardSelected]}>
              <View style={styles.titleRow}>
                <Text style={[styles.presetName, isSelected && styles.presetNameSelected]}>
                  {preset.name}
                </Text>
                <View style={styles.repoBadge}>
                  <Text style={styles.repoBadgeText}>{preset.repo}</Text>
                </View>
              </View>
              <Text style={styles.description} numberOfLines={2}>
                {preset.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: 8,
  },
  presetCard: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetCardSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f2942',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  presetName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  presetNameSelected: {
    color: '#38bdf8',
  },
  repoBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  repoBadgeText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  description: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
});
