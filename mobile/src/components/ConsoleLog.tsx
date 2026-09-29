import React, {useRef, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';

interface ConsoleLogProps {
  logs: string[];
}

export const ConsoleLog: React.FC<ConsoleLogProps> = ({logs}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({animated: true});
  }, [logs]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.circleRed} />
        <View style={styles.circleYellow} />
        <View style={styles.circleGreen} />
        <Text style={styles.headerTitle}>Terminal Output</Text>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.terminalBody}
        contentContainerStyle={styles.terminalContent}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>Ready for sideload. Logs will appear here...</Text>
        ) : (
          logs.map((log, index) => {
            const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('fail');
            const isSuccess = log.toLowerCase().includes('success') || log.toLowerCase().includes('done') || log.includes('🎉');
            return (
              <Text
                key={index}
                style={[
                  styles.logLine,
                  isError && styles.errorText,
                  isSuccess && styles.successText,
                ]}>
                {log}
              </Text>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginTop: 14,
    height: 170,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 6,
  },
  circleRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  circleYellow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  circleGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  headerTitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  terminalBody: {
    flex: 1,
  },
  terminalContent: {
    padding: 10,
  },
  emptyText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
  },
  logLine: {
    fontSize: 11,
    color: '#38bdf8',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 16,
  },
  errorText: {
    color: '#f87171',
  },
  successText: {
    color: '#4ade80',
    fontWeight: '700',
  },
});
