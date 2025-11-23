import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './app/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Righteous: require('./app/components/font/Righteous-Regular.ttf'),
    RighteousRegular: require('./app/components/font/Righteous-Regular.ttf'),
    PixelifySans: require('./app/components/font/PixelifySans-VariableFont_wght.ttf'),
    Pretendard: require('./app/components/font/PretendardVariable.ttf'),
    PretendardThin: require('./app/components/font/Pretendard-Thin.otf'),
    PretendardExtraLight: require('./app/components/font/Pretendard-ExtraLight.otf'),
    PretendardLight: require('./app/components/font/Pretendard-Light.otf'),
    PretendardRegular: require('./app/components/font/Pretendard-Regular.otf'),
    PretendardMedium: require('./app/components/font/Pretendard-Medium.otf'),
    PretendardSemiBold: require('./app/components/font/Pretendard-SemiBold.otf'),
    PretendardBold: require('./app/components/font/Pretendard-Bold.otf'),
    PretendardExtraBold: require('./app/components/font/Pretendard-ExtraBold.otf'),
    PretendardBlack: require('./app/components/font/Pretendard-Black.otf'),
    Inter: require('./app/components/font/Inter-VariableFont_slnt,wght.ttf'),
    InterThin: require('./app/components/font/Inter-Thin.ttf'),
    InterThinItalic: require('./app/components/font/Inter-ThinItalic.ttf'),
    InterExtraLight: require('./app/components/font/Inter-ExtraLight.ttf'),
    InterExtraLightItalic: require('./app/components/font/Inter-ExtraLightItalic.ttf'),
    InterLight: require('./app/components/font/Inter-Light.ttf'),
    InterLightItalic: require('./app/components/font/Inter-LightItalic.ttf'),
    InterRegular: require('./app/components/font/Inter-Regular.ttf'),
    InterItalic: require('./app/components/font/Inter-Italic.ttf'),
    InterMedium: require('./app/components/font/Inter-Medium.ttf'),
    InterMediumItalic: require('./app/components/font/Inter-MediumItalic.ttf'),
    InterSemiBold: require('./app/components/font/Inter-SemiBold.ttf'),
    InterSemiBoldItalic: require('./app/components/font/Inter-SemiBoldItalic.ttf'),
    InterBold: require('./app/components/font/Inter-Bold.ttf'),
    InterBoldItalic: require('./app/components/font/Inter-BoldItalic.ttf'),
    InterExtraBold: require('./app/components/font/Inter-ExtraBold.ttf'),
    InterExtraBoldItalic: require('./app/components/font/Inter-ExtraBoldItalic.ttf'),
    InterBlack: require('./app/components/font/Inter-Black.ttf'),
    InterBlackItalic: require('./app/components/font/Inter-BlackItalic.ttf'),
    NotoSansKR: require('./app/components/font/NotoSansKR-VariableFont_wght.ttf'),
    Lexend: require('./app/components/font/Lexend-VariableFont_wght.ttf'),
    LexendThin: require('./app/components/font/Lexend-Thin.ttf'),
    LexendExtraLight: require('./app/components/font/Lexend-ExtraLight.ttf'),
    LexendLight: require('./app/components/font/Lexend-Light.ttf'),
    LexendRegular: require('./app/components/font/Lexend-Regular.ttf'),
    LexendMedium: require('./app/components/font/Lexend-Medium.ttf'),
    LexendSemiBold: require('./app/components/font/Lexend-SemiBold.ttf'),
    LexendBold: require('./app/components/font/Lexend-Bold.ttf'),
    LexendExtraBold: require('./app/components/font/Lexend-ExtraBold.ttf'),
    LexendBlack: require('./app/components/font/Lexend-Black.ttf'),
    GothicA1Thin: require('./app/components/font/GothicA1-Thin.ttf'),
    GothicA1ExtraLight: require('./app/components/font/GothicA1-ExtraLight.ttf'),
    GothicA1Light: require('./app/components/font/GothicA1-Light.ttf'),
    GothicA1Regular: require('./app/components/font/GothicA1-Regular.ttf'),
    GothicA1Medium: require('./app/components/font/GothicA1-Medium.ttf'),
    GothicA1SemiBold: require('./app/components/font/GothicA1-SemiBold.ttf'),
    GothicA1Bold: require('./app/components/font/GothicA1-Bold.ttf'),
    GothicA1ExtraBold: require('./app/components/font/GothicA1-ExtraBold.ttf'),
    GothicA1Black: require('./app/components/font/GothicA1-Black.ttf'),
    NotoSansKRThin: require('./app/components/font/NotoSansKR-Thin.ttf'),
    NotoSansKRExtraLight: require('./app/components/font/NotoSansKR-ExtraLight.ttf'),
    NotoSansKRLight: require('./app/components/font/NotoSansKR-Light.ttf'),
    NotoSansKRRegular: require('./app/components/font/NotoSansKR-Regular.ttf'),
    NotoSansKRMedium: require('./app/components/font/NotoSansKR-Medium.ttf'),
    NotoSansKRSemiBold: require('./app/components/font/NotoSansKR-SemiBold.ttf'),
    NotoSansKRBold: require('./app/components/font/NotoSansKR-Bold.ttf'),
    NotoSansKRExtraBold: require('./app/components/font/NotoSansKR-ExtraBold.ttf'),
    NotoSansKRBlack: require('./app/components/font/NotoSansKR-Black.ttf'),
    Cafe24Ssurround: require('./app/components/font/Cafe24Ssurround-v2.0.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <AppNavigator />;
}
