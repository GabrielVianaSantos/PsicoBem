import { useCallback } from "react";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from "expo-font";
import { Raleway_400Regular, Raleway_700Bold } from '@expo-google-fonts/raleway';

const useLoadFonts = () => {
    const [fontsLoaded] = useFonts({
    "RalewayRegular": Raleway_400Regular,
    "RalewayBold": Raleway_700Bold,
});

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
          await SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    return { fontsLoaded, onLayoutRootView };
}

export default useLoadFonts;