import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
};

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
  textStyle,
  size = 'medium',
}: Props) {
  const isDisabled = disabled || loading;

  const getVariantContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.btnSecondary;
      case 'outline':
        return styles.btnOutline;
      case 'danger':
        return styles.btnDanger;
      case 'primary':
      default:
        return styles.btnPrimary;
    }
  };

  const getVariantTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.btnOutlineText;
      case 'secondary':
      case 'danger':
      case 'primary':
      default:
        return styles.btnPrimaryText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.sizeSmall;
      case 'large':
        return styles.sizeLarge;
      case 'medium':
      default:
        return styles.sizeMedium;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.btnBase,
        getSizeStyle(),
        getVariantContainerStyle(),
        isDisabled && styles.btnDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? '#F26430' : '#FFFFFF'}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.textBase, getVariantTextStyle(), textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  sizeSmall: {
    height: 38,
    paddingHorizontal: 12,
  },
  sizeMedium: {
    height: 48,
    paddingHorizontal: 16,
  },
  sizeLarge: {
    height: 54,
    paddingHorizontal: 20,
  },
  btnPrimary: {
    backgroundColor: '#F26430', // Orange CSF Treinamentos
  },
  btnSecondary: {
    backgroundColor: '#192633', // Dark Navy CSF Treinamentos
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#F26430',
  },
  btnDanger: {
    backgroundColor: '#EF4444',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  textBase: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
  },
  btnOutlineText: {
    color: '#F26430',
  },
});
