import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { BASE_URL } from '../services/api';

interface UserAvatarProps {
  foto?: string;
  userName?: string;
  customImageUrl?: string;
  size?: number;
}

export default function UserAvatar({
  foto,
  userName = '',
  customImageUrl,
  size = 50,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  function getInitials(name: string) {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  const cleanFoto = foto?.replace(/^"|"$/g, '');
  const fotoFilename = cleanFoto?.split('/').pop();

  let resolvedSource = '';
  if (customImageUrl) {
    resolvedSource = customImageUrl;
  } else if (cleanFoto && (cleanFoto.startsWith('http://') || cleanFoto.startsWith('https://'))) {
    resolvedSource = cleanFoto;
  } else if (fotoFilename) {
    resolvedSource = `${BASE_URL}/usuarios/foto/${fotoFilename}`;
  }

  const hasValidImage = !!resolvedSource && !imageError;

  return (
    <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      {hasValidImage ? (
        <Image
          source={{ uri: resolvedSource }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.userWithoutAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.initialText}>{getInitials(userName)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: '#CCCCCC',
    resizeMode: 'cover',
  },
  userWithoutAvatar: {
    backgroundColor: '#B6D0DD', // --color-carol-light
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#093A5D', // --color-indigo
    textAlign: 'center',
  },
});
