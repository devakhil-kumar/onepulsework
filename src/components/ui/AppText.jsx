import React from 'react';
import {Text} from 'react-native';
import {fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';

const variants = {
  display:    {fontSize: fontSize['4xl'], fontWeight: fontWeight.bold,     lineHeight: 40},
  h1:         {fontSize: fontSize['3xl'], fontWeight: fontWeight.bold,     lineHeight: 36},
  h2:         {fontSize: fontSize['2xl'], fontWeight: fontWeight.bold,     lineHeight: 30},
  h3:         {fontSize: fontSize.xl,    fontWeight: fontWeight.semiBold,  lineHeight: 26},
  h4:         {fontSize: fontSize.lg,    fontWeight: fontWeight.semiBold,  lineHeight: 24},
  body:       {fontSize: fontSize.base,  fontWeight: fontWeight.regular,   lineHeight: 22},
  bodyMedium: {fontSize: fontSize.base,  fontWeight: fontWeight.medium,    lineHeight: 22},
  bodySmall:  {fontSize: fontSize.sm,    fontWeight: fontWeight.regular,   lineHeight: 18},
  caption:    {fontSize: fontSize.xs,    fontWeight: fontWeight.regular,   lineHeight: 16},
  label:      {fontSize: fontSize.sm,    fontWeight: fontWeight.medium,    lineHeight: 18},
};

export default function AppText({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
  ...rest
}) {
  const colors = useColors();
  return (
    <Text
      style={[variants[variant], {color: color ?? colors.text}, style]}
      numberOfLines={numberOfLines}
      {...rest}>
      {children}
    </Text>
  );
}
