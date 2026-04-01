import type { AppTheme } from '@siteed/design-system';
import { ScreenWrapper, Text, useTheme } from '@siteed/design-system';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Page Container ──────────────────────────────────────────

interface PageContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PageContainer({ children, style }: PageContainerProps) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <ScreenWrapper style={style} useInsets={false} contentContainerStyle={{ padding: theme.padding.m, paddingBottom: bottom || 16 }}>
      {children}
    </ScreenWrapper>
  );
}

// ── Section Card ────────────────────────────────────────────

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Section({ title, children, style }: SectionProps) {
  const theme = useTheme();
  const s = sectionStyles(theme);
  return (
    <View style={[s.section, style]}>
      {title && <Text variant="titleMedium" style={s.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
}

function sectionStyles(theme: AppTheme) {
  return StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.roundness * 2,
      padding: theme.padding.m,
      marginBottom: theme.margin.m,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
        android: { elevation: 2 },
      }),
    },
    sectionTitle: {
      marginBottom: theme.margin.s,
      color: theme.colors.onSurface,
    },
  });
}

// ── Status & Error ──────────────────────────────────────────

interface StatusBlockProps {
  status?: string | null;
  error?: string | null;
}

export function StatusBlock({ status, error }: StatusBlockProps) {
  const theme = useTheme();
  if (!status && !error) return null;
  return (
    <Section>
      {status ? <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>{status}</Text> : null}
      {error ? <Text variant="bodyMedium" style={{ color: theme.colors.error }}>{error}</Text> : null}
    </Section>
  );
}

// ── Themed Button ───────────────────────────────────────────

type ButtonVariant = 'primary' | 'danger' | 'secondary' | 'success' | 'warning';

interface ThemedButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
  compact?: boolean;
}

function variantColors(variant: ButtonVariant, theme: AppTheme) {
  switch (variant) {
    case 'primary': return { bg: theme.colors.primary, text: theme.colors.onPrimary };
    case 'danger': return { bg: theme.colors.error, text: theme.colors.onError };
    case 'secondary': return { bg: theme.colors.secondaryContainer, text: theme.colors.onSecondaryContainer };
    case 'success': return { bg: theme.colors.success ?? '#4CAF50', text: '#fff' };
    case 'warning': return { bg: theme.colors.warning ?? '#FF9800', text: '#fff' };
  }
}

export function ThemedButton({ label, onPress, variant = 'primary', disabled, loading, testID, style, compact }: ThemedButtonProps) {
  const theme = useTheme();
  const colors = variantColors(variant, theme);
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        {
          backgroundColor: isDisabled ? (theme.colors.surfaceVariant ?? '#BDBDBD') : colors.bg,
          paddingHorizontal: compact ? 12 : 16,
          paddingVertical: compact ? 8 : 12,
          borderRadius: theme.roundness * 2,
          alignItems: 'center',
          minWidth: compact ? 60 : 100,
          ...Platform.select({
            ios: { shadowColor: isDisabled ? 'transparent' : '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDisabled ? 0 : 0.2, shadowRadius: 3 },
            android: { elevation: isDisabled ? 0 : 3 },
          }),
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isDisabled ? theme.colors.onSurfaceVariant : colors.text} size="small" />
      ) : (
        <Text
          variant={compact ? 'labelMedium' : 'labelLarge'}
          style={{
            color: isDisabled ? (theme.colors.onSurfaceVariant ?? '#757575') : colors.text,
            fontWeight: isDisabled ? '400' : '700',
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Model Selector ──────────────────────────────────────────

interface ModelItem {
  metadata: { id: string; name: string };
}

interface ModelSelectorProps {
  models: ModelItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  accentColor?: string;
  emptyMessage?: string;
  testIdPrefix?: string;
}

export function ModelSelector({ models, selectedId, onSelect, disabled, accentColor, emptyMessage, testIdPrefix }: ModelSelectorProps) {
  const theme = useTheme();
  const accent = accentColor || theme.colors.primary;

  if (models.length === 0) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {emptyMessage || 'No models downloaded. Go to Models tab to download.'}
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.gap?.s ?? 8 }}>
      {models.map(model => {
        const selected = selectedId === model.metadata.id;
        return (
          <TouchableOpacity
            key={model.metadata.id}
            testID={testIdPrefix ? `${testIdPrefix}-${model.metadata.id}` : undefined}
            style={[
              {
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: theme.roundness * 1.5,
                borderWidth: 1,
                borderColor: selected ? accent : theme.colors.outlineVariant,
                backgroundColor: selected ? accent : 'transparent',
              },
            ]}
            onPress={() => onSelect(model.metadata.id)}
            disabled={disabled}
          >
            <Text
              variant="labelMedium"
              style={{ color: selected ? '#fff' : theme.colors.onSurface }}
            >
              {model.metadata.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Audio Item Selector ─────────────────────────────────────

interface AudioItem {
  id: string;
  name: string;
}

interface AudioSelectorProps {
  items: AudioItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function AudioSelector({ items, selectedId, onSelect, disabled }: AudioSelectorProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.gap?.s ?? 8, marginBottom: theme.margin.s }}>
      {items.map(item => {
        const selected = selectedId === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: theme.roundness * 1.5,
              borderWidth: 1,
              borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
              backgroundColor: selected ? theme.colors.primaryContainer : 'transparent',
            }}
            onPress={() => onSelect(item.id)}
            disabled={disabled}
          >
            <Text variant="labelSmall" style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Results Box ─────────────────────────────────────────────

interface ResultsBoxProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ResultsBox({ children, style }: ResultsBoxProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          marginTop: theme.margin.s,
          padding: theme.padding.s,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.roundness,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Loading Overlay ─────────────────────────────────────────

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  onStop?: () => void;
}

export function LoadingOverlay({ visible, message, subMessage, onStop }: LoadingOverlayProps) {
  const theme = useTheme();
  if (!visible) return null;
  return (
    <View style={{
      position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
    }}>
      <View style={{
        backgroundColor: theme.colors.surface,
        padding: 24, borderRadius: theme.roundness * 3,
        alignItems: 'center', minWidth: 250, maxWidth: '80%',
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
          android: { elevation: 5 },
        }),
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="titleSmall" style={{ marginTop: 12, textAlign: 'center', color: theme.colors.onSurface }}>
          {message || 'Processing...'}
        </Text>
        {subMessage && (
          <Text variant="bodySmall" style={{ marginTop: 4, textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
            {subMessage}
          </Text>
        )}
        {onStop && (
          <ThemedButton
            label="Stop"
            variant="danger"
            onPress={onStop}
            style={{ marginTop: 16, width: '100%' }}
          />
        )}
      </View>
    </View>
  );
}

// ── Config Row ──────────────────────────────────────────────

interface ConfigRowProps {
  label: string;
  children: React.ReactNode;
}

export function ConfigRow({ label, children }: ConfigRowProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.margin.s }}>
      <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ── Chip / Tag ──────────────────────────────────────────────

interface ChipProps {
  label: string;
  color?: string;
  backgroundColor?: string;
}

export function Chip({ label, color, backgroundColor }: ChipProps) {
  const theme = useTheme();
  return (
    <View style={{
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: backgroundColor || theme.colors.secondaryContainer,
    }}>
      <Text variant="labelSmall" style={{ color: color || theme.colors.onSecondaryContainer, fontWeight: '500' }}>
        {label}
      </Text>
    </View>
  );
}

// Re-export commonly used items
export { Text, useTheme };
export { AudioPlayButton } from './AudioPlayButton';
