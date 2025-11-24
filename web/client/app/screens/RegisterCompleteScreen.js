import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function RegisterCompleteScreen({ navigation, route }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const credentials = route?.params?.credentials ?? null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('Login', {
        prefillCredentials: credentials,
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image source={require('../components/image/main_logo.png')} style={styles.logoImage} />
          <Text style={styles.appText}>낑깡</Text>
        <Text style={styles.titleText}>To-get List</Text>
        <View style={styles.messageContainer}>
          <Text style={styles.completionTitle}>축하해요!</Text>
          <Text style={styles.completionSubtitle}>회원가입이 완료되었어요</Text>
        </View>
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
    justifyContent: 'center',
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
    marginBottom: 4,
    fontFamily: 'Cafe24Ssurround',
  },
  titleText: {
    fontSize: 32,
    fontFamily: 'Cafe24Ssurround',
    color: '#000000',
    marginBottom: 20,
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  completionTitle: {
    fontSize: 20,
    fontFamily: 'PretendardBold',
    color: '#000000',
    marginBottom: 5,
  },
  completionSubtitle: {
    fontSize: 20,
    fontFamily: 'PretendardBold',
    color: '#000000',
  },
});

