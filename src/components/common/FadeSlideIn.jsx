import React, {useRef, useEffect} from 'react';
import {Animated} from 'react-native';

export default function FadeSlideIn({children, style, delay = 0, distance = 18, duration = 260}) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration, delay, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration, delay, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{flex: 1}, style, {opacity, transform: [{translateY}]}]}>
      {children}
    </Animated.View>
  );
}
