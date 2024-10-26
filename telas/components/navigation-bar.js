import React from "react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Relatorios from "../relatorios";
import Sessoes from "../sessoes";
import Home from "../home"
import { Icon } from "react-native-elements";

const Tab = createBottomTabNavigator();
const CustomTabBarIcon = (iconName, color) => {
  // return <Icon type="ionicon" name={iconName} color={color}/>
  <Icon type="ionicon" name={iconName} color={color}/>
}

// const Navigation = () => {
export default function Navigation() {
  return (
    // <NavigationContainer>
      <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({color}) => {
          let iconName;
          if (route.name === 'Relatórios') {
            iconName = 'stats-chart'
          } else if (route.name === 'Home'){
            iconName = 'home'
          } else if (route.name === 'Sessões') {
            iconName = 'calendar-number-sharp'
          }
          return CustomTabBarIcon (iconName, color)
          },

          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: '#007269',
          tabBarLabelStyle: {fontSize: 14, fontFamily: "RalewayBold"},
          tabBarStyle: {backgroundColor: '#11B5A4', paddingHorizontal: 30},
          tabBarLabel: () => null,
      })}
      >
        <Tab.Screen name="Relatórios" component={Relatorios} options={{headerShown: false}}/>
        <Tab.Screen name="Home" component={Home} options={{headerShown: false}}/>
        <Tab.Screen name="Sessões" component={Sessoes} options={{headerShown: false}}/>
      </Tab.Navigator>
    // </NavigationContainer>
  );
};

// export default Navigation;
// export default Navigation;
