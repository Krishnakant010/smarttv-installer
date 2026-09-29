import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import {HomeScreen} from './src/screens/HomeScreen';

const App = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <HomeScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
});

export default App;
