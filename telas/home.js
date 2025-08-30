import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import SectionOdisseia from '../src/sections/montanha.png';
import SectionSementes from '../src/sections/semente.png';
import SectionGuias from '../src/sections/prancheta.png';
import Topo from "./components/topo";
import { Ionicons } from '@expo/vector-icons';
import CustomScrollView from "./components/customScrollView";   
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const Home = (topo) => {
    const navigation = useNavigation();

  return (
    <>
     <Topo {...topo} /> 
     <SafeAreaView style={styles.container}>
         <CustomScrollView> 
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileLeft}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>S</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.greetingText}>Olá, Stella</Text>
                <Text style={styles.phoneNumber}>14565778765</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationIcon}>
              <Ionicons name="notifications" size={24} color="#11B5A4" />
            </TouchableOpacity>
          </View>

        <View style={styles.divider} />
      
        {/* Menu Cards */}
        <View style={styles.cardsContainer}>
          {/* Card 1 */}
          <View style={styles.cardOuterContainer}>
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RegistrosOdisseia')}>
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>Registros de Odisseia</Text>
                  <Text style={styles.cardSubtitle}>Veja as emoções de{'\n'}seus pacientes</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image 
                    source={SectionOdisseia}
                    style={styles.cardIcon}
                    // Alternativamente, você pode usar um ícone:
                    // <Ionicons name="analytics-outline" size={32} color="#11B5A4" />
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        
          {/* Card 2 */}
          <View style={styles.cardOuterContainer}>
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SementesCuidado')}>
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>Sementes do Cuidado</Text>
                  <Text style={styles.cardSubtitle}>Deixe Dicas para seus{'\n'}pacientes aqui</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image 
                    source={SectionSementes}
                    style={styles.cardIcon}
                    // Alternativamente, você pode usar um ícone:
                    // <Ionicons name="leaf-outline" size={32} color="#11B5A4" />
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        
          {/* Card 3 */}
          <View style={styles.cardOuterContainer}>
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GuiasApoio')}>
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>Guias do Apoio</Text>
                  <Text style={styles.cardSubtitle}>Dados dos pacientes{'\n'}na palma da mão</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image 
                    source={SectionGuias}
                    style={styles.cardIcon}
                    // Alternativamente, você pode usar um ícone:
                    // <Ionicons name="clipboard-outline" size={32} color="#11B5A4" />
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </CustomScrollView> 
      </SafeAreaView> 
    </>
    );
};


const styles = StyleSheet.create ({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingBottom: 0
    },

header: {
    backgroundColor: '#11B5A4',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 34,
    fontFamily: 'sans-serif-light',
  },
  logoTextBold: {
    fontWeight: 'bold',
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5aaa9a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 15,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11B5A4',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#11B5A4',
  },
  notificationIcon: {
    padding: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#5aaa9a',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    color: 'white',
    fontSize: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 25,
    backgroundColor: '#4F9785',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    width: 44,
    height: 44,
  },

  cardOuterContainer: {
    backgroundColor: '#4b9588', // Tom mais escuro do verde para o container externo
    borderRadius: 15,
    marginBottom: 15,
    padding: 0, // Sem padding para o container externo
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
})

export default Home;