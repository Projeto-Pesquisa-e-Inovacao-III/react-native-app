import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { api, BASE_URL } from '../services/api';

interface UserAvatarProps {
  foto?: string;
  userName?: string;
  customImageUrl?: string;
  size?: number;
}

// Cache em memória para evitar requisições repetidas da mesma imagem
export const avatarCache = new Map<string, string>();

export function setCachedAvatar(filename: string, uri: string) {
  avatarCache.set(filename, uri);
}

export function clearCachedAvatar(filename?: string) {
  if (filename) {
    avatarCache.delete(filename);
  } else {
    avatarCache.clear();
  }
}

export default function UserAvatar({
  foto,
  userName = '',
  customImageUrl,
  size = 50,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  function getInitials(name: string) {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  // Verifica se é uma URI local (file://, content://, data:)
  const isLocalUri =
    customImageUrl &&
    (customImageUrl.startsWith('file://') ||
      customImageUrl.startsWith('content://') ||
      customImageUrl.startsWith('data:'));

  // Extrai o nome do arquivo da foto remota
  const rawFoto = foto || (customImageUrl && !isLocalUri ? customImageUrl : '');
  const cleanFoto = rawFoto.replace(/^"|"$/g, '').split('?')[0];
  const fotoFilename = cleanFoto ? cleanFoto.split('/').pop() : null;
  const isValidFilename = !!fotoFilename && fotoFilename !== 'null' && fotoFilename !== 'undefined' && fotoFilename.length > 3;

  const [loadedUri, setLoadedUri] = useState<string | null>(() => {
    if (isLocalUri) return customImageUrl!;
    if (isValidFilename && avatarCache.has(fotoFilename!)) {
      return avatarCache.get(fotoFilename!)!;
    }
    return null;
  });

  useEffect(() => {
    // Se o usuário selecionou uma imagem local recente
    if (isLocalUri) {
      setLoadedUri(customImageUrl!);
      setImageError(false);
      setLoading(false);
      return;
    }

    // Se não há foto configurada
    if (!isValidFilename) {
      setLoadedUri(null);
      setImageError(false);
      setLoading(false);
      return;
    }

    const filename = fotoFilename!;

    // Se já está em cache
    if (avatarCache.has(filename)) {
      setLoadedUri(avatarCache.get(filename)!);
      setImageError(false);
      setLoading(false);
      return;
    }

    // Busca imagem autenticada via axios (que possui os cookies da sessão)
    let isMounted = true;
    setLoading(true);
    setImageError(false);

    console.log('[UserAvatar] Buscando foto autenticada via API:', filename);

    api
      .get(`/usuarios/foto/${filename}`, { responseType: 'blob' })
      .then((response) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          console.log('[UserAvatar] Foto convertida com sucesso para base64, tamanho:', base64Data?.length);
          if (isMounted && base64Data) {
            avatarCache.set(filename, base64Data);
            setLoadedUri(base64Data);
            setLoading(false);
          }
        };
        reader.onerror = (e) => {
          console.warn('[UserAvatar] Erro ao ler blob com FileReader:', e);
          if (isMounted) {
            setImageError(true);
            setLoading(false);
          }
        };
        reader.readAsDataURL(response.data);
      })
      .catch((err) => {
        console.warn('[UserAvatar] Erro ao buscar foto via API:', err?.response?.status, err?.message);
        if (isMounted) {
          setImageError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [foto, customImageUrl, isLocalUri, isValidFilename, fotoFilename]);

  const hasValidImage = !!loadedUri && !imageError;
  const initialFontSize = size >= 80 ? Math.round(size * 0.38) : 18;

  return (
    <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      {loading && !hasValidImage && (
        <View style={[styles.userWithoutAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator size="small" color="#093A5D" />
        </View>
      )}

      {hasValidImage ? (
        <Image
          key={loadedUri}
          source={{ uri: loadedUri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={(e) => {
            console.warn('[UserAvatar] Erro no componente Image:', e.nativeEvent);
            setImageError(true);
          }}
        />
      ) : !loading ? (
        <View style={[styles.userWithoutAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initialText, { fontSize: initialFontSize }]}>
            {getInitials(userName)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
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
    fontWeight: 'bold',
    color: '#093A5D', // --color-indigo
    textAlign: 'center',
  },
});
