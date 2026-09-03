import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = {
  id: string;
  openSelectId: string | null;
  setOpenSelectId: (id: string | null) => void;
  onSelectStatusChange: (value: string) => void;
  selectStatusValue?: string;
  values?: SelectOption[];
  selectPlaceholder?: string;
  showSelectAll?: boolean;
  style?: object;
};

export default function Select({
  id,
  openSelectId,
  setOpenSelectId,
  onSelectStatusChange,
  selectStatusValue,
  values = [],
  selectPlaceholder = 'Selecione',
  showSelectAll = true,
  style,
}: SelectProps) {
  const isOpen = openSelectId === id;
  const selectedOption = values.find((opt) => opt.value === selectStatusValue);
  const displayText = selectedOption?.label || selectPlaceholder;

  function handleSelect(val: string) {
    onSelectStatusChange(val);
    setOpenSelectId(null);
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpenSelectId(isOpen ? null : id)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <ChevronDown size={18} color="#4B5563" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenSelectId(null)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenSelectId(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownMenu}>
                {showSelectAll && (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      !selectStatusValue && styles.optionItemSelected,
                    ]}
                    onPress={() => handleSelect('')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        !selectStatusValue && styles.optionLabelSelected,
                      ]}
                    >
                      Selecionar todos
                    </Text>
                    {!selectStatusValue && <Check size={16} color="#093A5D" />}
                  </TouchableOpacity>
                )}

                {values.map((option) => {
                  const isSelected = selectStatusValue === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                      ]}
                      onPress={() => !option.disabled && handleSelect(option.value)}
                      disabled={option.disabled}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                          option.disabled && styles.optionLabelDisabled,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && <Check size={16} color="#093A5D" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 150,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#cecdcd',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  triggerText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {
    color: '#6B7280',
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionItemSelected: {
    backgroundColor: '#F0F7FF',
  },
  optionLabel: {
    fontSize: 15,
    color: '#374151',
  },
  optionLabelSelected: {
    color: '#093A5D',
    fontWeight: '600',
  },
  optionLabelDisabled: {
    color: '#9CA3AF',
  },
});
