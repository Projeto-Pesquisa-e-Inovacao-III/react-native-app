import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export type PaginationInfo = {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type PaginatedListProps = {
  page: number;
  pagination?: PaginationInfo | null;
  onPageChange: (newPage: number) => void;
  alwaysShowPagination?: boolean;
  children: React.ReactNode;
};

export default function PaginatedList({
  page,
  pagination,
  onPageChange,
  alwaysShowPagination = false,
  children,
}: PaginatedListProps) {
  const isFirst = page === 0;
  const isLast = pagination ? page >= pagination.totalPages - 1 : true;

  const visiblePages = useMemo(() => {
    if (!pagination) return [];
    const totalPages = pagination.totalPages;
    let start = Math.max(0, page - 1);
    let end = Math.min(totalPages - 1, page + 1);

    if (end - start < 2) {
      if (start === 0) {
        end = Math.min(totalPages - 1, start + 2);
      } else if (end === totalPages - 1) {
        start = Math.max(0, end - 2);
      }
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      if (totalPages > 3 && (i === 0 || i === totalPages - 1)) continue;
      pages.push(i);
    }
    return pages;
  }, [page, pagination]);

  const shouldShowPagination = pagination && (alwaysShowPagination || pagination.totalPages > 1);

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>

      {shouldShowPagination && (
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, isFirst && styles.buttonDisabled]}
            onPress={() => {
              if (!isFirst) onPageChange(page - 1);
            }}
            disabled={isFirst}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={isFirst ? '#9CA3AF' : '#FFFFFF'} />
          </TouchableOpacity>

          {pagination.totalPages > 3 && (
            <>
              <TouchableOpacity
                style={[styles.pageButton, page === 0 && styles.activePage]}
                onPress={() => onPageChange(0)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageButtonText, page === 0 && styles.activePageText]}>1</Text>
              </TouchableOpacity>
              {visiblePages.length > 0 && visiblePages[0] > 1 && (
                <Text style={styles.ellipsis}>...</Text>
              )}
            </>
          )}

          {visiblePages.map((p) => {
            const isActive = page === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.pageButton, isActive && styles.activePage]}
                onPress={() => {
                  if (page !== p) onPageChange(p);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageButtonText, isActive && styles.activePageText]}>
                  {p + 1}
                </Text>
              </TouchableOpacity>
            );
          })}

          {pagination.totalPages > 3 && (
            <>
              {visiblePages.length > 0 &&
                visiblePages[visiblePages.length - 1] < pagination.totalPages - 2 && (
                  <Text style={styles.ellipsis}>...</Text>
                )}
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page === pagination.totalPages - 1 && styles.activePage,
                ]}
                onPress={() => onPageChange(pagination.totalPages - 1)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page === pagination.totalPages - 1 && styles.activePageText,
                  ]}
                >
                  {pagination.totalPages}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.navButton, isLast && styles.buttonDisabled]}
            onPress={() => {
              if (!isLast) onPageChange(page + 1);
            }}
            disabled={isLast}
            activeOpacity={0.7}
          >
            <ChevronRight size={20} color={isLast ? '#9CA3AF' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    width: '100%',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
    marginBottom: 16,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#093A5D',
  },
  pageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#093A5D',
    backgroundColor: '#FFFFFF',
  },
  pageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#093A5D',
  },
  activePage: {
    backgroundColor: '#093A5D',
  },
  activePageText: {
    color: '#FFFFFF',
  },
  buttonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.6,
  },
  ellipsis: {
    fontSize: 16,
    color: '#6B7280',
    paddingHorizontal: 4,
  },
});
