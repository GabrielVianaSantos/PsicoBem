import { StyleSheet, View, Text, TouchableOpacity, ExpandableSection } from "react-native"
import Topo from "./components/topo"
import { useState } from "react";
import {Ionicons} from "@expo/vector-icons"
import DynamicButton from "./components/botao-dinamico"

export default function RegistroCompleto(topo){
    const [/* Your state variables here */, setYourState] = useState(/* initial values */);

  // Function to handle button press if needed (optional)
    const handleButtonPress = () => {
    // Your button press logic here
  };

    return<>
    <Topo {...topo}/>
    <View style={estilos.tela}>
        <DynamicButton
          initialContent="Seu texto inicial para o botão" // Replace with your initial content
          onPress={handleButtonPress} // Optional onPress handler
        />
    </View>
    </>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        padding: 25,
    },
})