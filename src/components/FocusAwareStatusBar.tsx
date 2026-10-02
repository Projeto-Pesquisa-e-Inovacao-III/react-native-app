import React, { useEffect } from 'react';
import { StatusBar, StatusBarProps } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';

export default function FocusAwareStatusBar({
  style = 'auto',
  animated = true,
  ...props
}: StatusBarProps) {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && style) {
      StatusBar.setStyle(style, animated);
    }
  }, [isFocused, style, animated]);

  return isFocused ? <StatusBar style={style} animated={animated} {...props} /> : null;
}
