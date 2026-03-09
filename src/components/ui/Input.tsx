/**
 * MPVP — Input Component (Dynamic Theme)
 * matches Screenshot 2 styling with error and label support.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  FlexAlignType,
} from 'react-native';
import { useColors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  icon?: string;
  required?: boolean;
  inputHeight?: number;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  icon,
  style,
  editable = true,
  ...props
}: InputProps) {
  const Colors = useColors();
  const isMultiline = !!props.multiline || (!!props.inputHeight && props.inputHeight > 60);
  const computedHeight = props.inputHeight ?? (props.multiline ? 120 : 54);

  const containerDynamicStyle = useMemo(() => ({
    backgroundColor: editable ? Colors.bgInput : Colors.bgInputReadOnly,
    borderColor: Colors.borderDefault,
    alignItems: (isMultiline ? 'flex-start' : 'center') as FlexAlignType,
    paddingVertical: isMultiline ? 12 : 0,
    minHeight: computedHeight,
  }), [Colors.bgInput, Colors.bgInputReadOnly, Colors.borderDefault, editable, isMultiline, computedHeight]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: Colors.textSecondary }]}>{label}</Text>}

      <View style={[
        styles.inputContainer,
        containerDynamicStyle,
        error ? { borderColor: Colors.borderError } : null,
      ]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={[
            styles.input,
            { color: Colors.textPrimary },
            !editable && { color: Colors.textMuted },
            { minHeight: computedHeight },
            style
          ]}
          placeholderTextColor={Colors.textPlaceholder}
          editable={editable}
          textAlignVertical={props.textAlignVertical ?? (isMultiline ? 'top' : 'center')}
          {...props}
        />
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: Colors.textDanger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: Colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    height: 56,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});
