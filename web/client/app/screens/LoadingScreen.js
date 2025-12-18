import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function LoadingScreen({ navigation, route }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const authPayload = route?.params?.auth;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('Home', { auth: authPayload });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image source={require('../components/image/main_logo.png')} style={styles.logoImage} />
          <Text style={styles.appText}>낑깡</Text>
        <Text style={styles.titleText}>To-get List</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoImage: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  appText: {
    fontSize: 28,
    color: '#000000',
    fontFamily: 'Cafe24Ssurround',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 32,
    color: '#000000',
    fontFamily: 'Cafe24Ssurround',
  },
});

