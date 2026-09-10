import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export type RowItem = {
  headerTitle: string;
  title: string;
  subtitle: React.ReactNode;
  id: number;
  tipoAula?: string;
};

type RowWithHeaderTitleProps = {
  data: RowItem[];
  includeDetailsButton?: boolean;
  buttonLabel?: string;
  handleDetailsClick?: (id: number) => void;
  isLoading?: boolean;
};

function getBorderColor(item?: RowItem): string {
  if (!item) return '#093A5D';
  const check = (item.tipoAula || item.title || '').toUpperCase();
  if (check.includes('PRESENCIAL')) return '#093A5D';
  if (check.includes('RESIDENCIAL')) return '#F26430';
  if (check.includes('FUNCIONAL')) return '#82ADC5';
  return '#093A5D';
}

export default function RowWithHeaderTitle({
  data,
  includeDetailsButton = true,
  buttonLabel = 'Ver Detalhes',
  handleDetailsClick,
  isLoading = false,
}: RowWithHeaderTitleProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  if (isLoading) {
    return (
      <View style={styles.list}>
        {[1, 2, 3].map((key) => (
          <View key={`skeleton-${key}`} style={[styles.card, styles.skeletonCard]}>
            <View style={styles.skeletonHeader}>
              <View style={styles.skeletonLineShort} />
            </View>
            <View style={[styles.cardBody, isWide && styles.cardBodyWide]}>
              <View style={styles.textContainer}>
                <View style={styles.skeletonLineMedium} />
                <View style={styles.skeletonLineLong} />
              </View>
              <View style={styles.skeletonButton} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <View style={styles.list}>
      {data.map((item, index) => {
        const borderColor = getBorderColor(item);

        return (
          <View
            key={`${item.id}-${index}`}
            style={[styles.card, { borderLeftColor: borderColor, borderLeftWidth: 6 }]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.headerText}>{item.headerTitle}</Text>
            </View>

            <View style={[styles.cardBody, isWide && styles.cardBodyWide]}>
              <View style={[styles.textContainer, isWide && styles.textContainerWide]}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                {typeof item.subtitle === 'string' ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                ) : (
                  item.subtitle
                )}
              </View>

              {includeDetailsButton && (
                <TouchableOpacity
                  style={[styles.detailsButton, isWide && styles.detailsButtonWide]}
                  onPress={() => handleDetailsClick?.(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailsButtonText}>{buttonLabel}</Text>
                  <ChevronRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'capitalize',
  },
  cardBody: {
    padding: 16,
    flexDirection: 'column',
    gap: 14,
  },
  cardBodyWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    gap: 4,
  },
  textContainerWide: {
    flex: 1,
    marginRight: 16,
  },
  detailsButtonWide: {
    alignSelf: 'center',
    marginTop: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  detailsButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#093A5D',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  skeletonCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#E5E7EB',
    opacity: 0.7,
  },
  skeletonHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  skeletonLineShort: {
    width: '35%',
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  skeletonLineMedium: {
    width: '60%',
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  skeletonLineLong: {
    width: '85%',
    height: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  skeletonButton: {
    width: 120,
    height: 36,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
});
