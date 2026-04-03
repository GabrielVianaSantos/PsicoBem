import React from 'react';
import { ScrollView } from 'react-native';

const CustomScrollView = (props) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false} {...props}>
      {props.children}
    </ScrollView>
  );
};

export default CustomScrollView;