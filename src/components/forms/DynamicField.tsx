/**
 * MPVP — DynamicField Component (Premium Dark Theme)
 * Renders any FindingsFieldSchema field type with fallback to TextInput.
 * Matches Screenshot 2 "Detailed Inspection Data" design.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { Input } from '@/components/ui/Input';
import { useColors } from '@/constants/colors';
import type { DynamicFieldProps } from '@/types/form.types';
import type { FindingsFieldType } from '@/types/schema.types';
import { BottomSheetPicker } from '@/components/ui/BottomSheetPicker';

const KNOWN_TYPES: FindingsFieldType[] = ['text', 'textarea', 'number', 'date', 'dropdown'];

export function DynamicField({ field, value, onChange, error }: DynamicFieldProps) {
  const colors = useColors();
  const isUnknownType = !KNOWN_TYPES.includes(field.type);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    outerContainer: {
      marginBottom: 24,
    },
    fieldContainer: {
      marginBottom: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    required: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: '500',
    },
    selectField: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.bgInput,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectFieldError: {
      borderColor: colors.danger,
      backgroundColor: colors.bgInputError,
    },
    selectText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
      flex: 1,
    },
    placeholderText: {
      color: colors.textMuted,
    },
    chevron: {
      fontSize: 16,
      color: colors.textMuted,
      marginLeft: 8,
    },
    error: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.danger,
      marginTop: 6,
      marginLeft: 4,
    },
    unknownWarning: {
      backgroundColor: colors.warningSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 4,
    },
    unknownWarningText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.warning,
    },
    toggleContainer: {
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.bgInput,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    toggleContainerActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(37, 99, 235, 0.05)',
    },
    toggleCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.borderDefault,
      marginRight: 12,
    },
    toggleCircleActive: {
      backgroundColor: colors.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
    },
    uploadField: {
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primaryMuted,
      backgroundColor: 'rgba(37, 99, 235, 0.02)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadIcon: {
      fontSize: 18,
      marginRight: 10,
      color: colors.primary,
    },
    uploadText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    rangeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rangeInput: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.bgInput,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    rangeSeparator: {
      marginHorizontal: 10,
      color: colors.textMuted,
      fontSize: 12,
    },
    rangeText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    partnerList: {
      backgroundColor: colors.bgInput,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    partnerPlaceholder: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginBottom: 12,
    },
    partnerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
      marginBottom: 10,
    },
    partnerText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    addButton: {
      height: 40,
      borderRadius: 8,
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    addButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  }), [colors]);

  const handleTextChange = useCallback(
    (text: string) => onChange(text || null),
    [onChange],
  );

  const handleNumberChange = useCallback(
    (text: string) => {
      const num = text.replace(/[^0-9]/g, '');
      onChange(num ? parseInt(num, 10) : null);
    },
    [onChange],
  );

  const handleDropdownPress = useCallback(() => {
    if (!field.options?.length) return;
    setDropdownOpen(true);
  }, [field]);

  const handleOptionSelect = useCallback((option: string) => {
    onChange(option);
    setDropdownOpen(false);
  }, [onChange]);

  const handlePickerClose = useCallback(() => setDropdownOpen(false), []);

  const handleDatePress = useCallback(() => {
    // Simulated Date Picker: Show Alert with recent/future options for demo
    const dates = [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() - 86400000).toISOString().split('T')[0],
      new Date(Date.now() - 172800000).toISOString().split('T')[0],
    ];

    Alert.alert(
      'Select Date',
      'Select an inspection date:',
      [
        { text: `Today (${dates[0]})`, onPress: () => onChange(dates[0]) },
        { text: `Yesterday (${dates[1]})`, onPress: () => onChange(dates[1]) },
        { text: `2 Days Ago (${dates[2]})`, onPress: () => onChange(dates[2]) },
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  }, [onChange]);

  // ─── Render by type ────────────────────────────────────

  const renderInput = () => {
    const effectiveType = isUnknownType ? 'text' : field.type;

    switch (effectiveType) {
      case 'textarea':
        return (
          <Input
            label={field.label}
            value={String(value ?? '')}
            onChangeText={handleTextChange}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            multiline
            numberOfLines={6}
            inputHeight={140}
            required={field.required}
            error={error}
            maxLength={field.max_length}
          />
        );

      case 'number':
        return (
          <Input
            label={field.label}
            value={value != null ? String(value) : ''}
            onChangeText={handleNumberChange}
            placeholder="0"
            keyboardType="number-pad"
            required={field.required}
            error={error}
          />
        );

      case 'boolean':
        return (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> * Required</Text>}
            </Text>
            <Pressable
              onPress={() => onChange(!value)}
              style={[styles.toggleContainer, value ? styles.toggleContainerActive : null]}
            >
              <View style={[styles.toggleCircle, value ? styles.toggleCircleActive : null]} />
              <Text style={[styles.toggleText, { color: value ? colors.primary : colors.textMuted }]}>
                {value ? 'Confirmed' : 'Pending Confirmation'}
              </Text>
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        );

      case 'file_upload':
        return (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> * Required</Text>}
            </Text>
            <Pressable style={styles.uploadField}>
              <Text style={styles.uploadIcon}>📎</Text>
              <Text style={styles.uploadText}>
                {value ? 'Document Attached' : 'Upload Shariah / Ownership Certificate'}
              </Text>
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        );

      case 'date_range':
        const [start, end] = Array.isArray(value) ? value : ['', ''];
        return (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> * Required</Text>}
            </Text>
            <View style={styles.rangeContainer}>
              <Pressable style={styles.rangeInput} onPress={handleDatePress}>
                <Text style={[styles.rangeText, !start && styles.placeholderText]}>{start || 'Start Date'}</Text>
              </Pressable>
              <Text style={styles.rangeSeparator}>至</Text>
              <Pressable style={styles.rangeInput} onPress={handleDatePress}>
                <Text style={[styles.rangeText, !end && styles.placeholderText]}>{end || 'End Date'}</Text>
              </Pressable>
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        );

      case 'partner_list':
        const items = Array.isArray(value) ? value : [];
        return (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> * Required</Text>}
            </Text>
            <View style={styles.partnerList}>
              {items.length === 0 ? (
                <Text style={styles.partnerPlaceholder}>No entries recorded. Press below to add.</Text>
              ) : (
                items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.partnerItem}>
                    <Text style={styles.partnerText}>{item.name || `Entry #${idx + 1}`}</Text>
                    <Pressable
                      onPress={() => {
                        const next = [...items];
                        next.splice(idx, 1);
                        onChange(next);
                      }}
                    >
                      <Text style={{ color: colors.danger, fontWeight: '700' }}>Remove</Text>
                    </Pressable>
                  </View>
                ))
              )}
              <Pressable
                style={styles.addButton}
                onPress={() => {
                  Alert.prompt(
                    'New Entry',
                    'Enter details for this partnership / schedule entry:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Add',
                        onPress: (text?: string) => onChange([...items, { name: text }])
                      }
                    ],
                    'plain-text'
                  );
                }}
              >
                <Text style={styles.addButtonText}>+ Add Partner / Entry Row</Text>
              </Pressable>
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        );

      case 'date':
      case 'dropdown':
        const displayValue = value ? String(value) : (field.type === 'date' ? 'Select date' : 'Select option');
        return (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> * Required</Text>}
            </Text>
            <Pressable
              onPress={field.type === 'date' ? handleDatePress : handleDropdownPress}
              style={[styles.selectField, error && styles.selectFieldError]}
            >
              <Text style={[styles.selectText, !value && styles.placeholderText]}>
                {displayValue}
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        );

      case 'text':
      default:
        return (
          <Input
            label={field.label}
            value={String(value ?? '')}
            onChangeText={handleTextChange}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
            error={error}
            maxLength={field.max_length}
          />
        );
    }
  };

  return (
    <>
      <View style={styles.outerContainer}>
        {renderInput()}
        {isUnknownType && (
          <View style={styles.unknownWarning}>
            <Text style={styles.unknownWarningText}>
              ⚠ Unsupported field type — rendered as text
            </Text>
          </View>
        )}
      </View>
      {field.type === 'dropdown' && field.options?.length ? (
        <BottomSheetPicker
          visible={dropdownOpen}
          title={field.label}
          options={field.options}
          selected={value}
          onSelect={handleOptionSelect}
          onClose={handlePickerClose}
        />
      ) : null}
    </>
  );
}
