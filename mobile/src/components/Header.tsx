import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export const Header: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>v1.0.0 MOBILE</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Wi-Fi Ready</Text>
        </View>
      </View>
      <Text style={styles.title}>SmartTV Installer</Text>
      <Text style={styles.subtitle}>Sideload to Samsung Tizen & LG webOS from your phone</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
});
