/**
 * Minimal react-native mock for vitest/jsdom.
 * Maps RN primitives to HTML elements so components can render in tests.
 */
import React from 'react';

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, s) => ({...acc, ...flattenStyle(s)}), {});
  }
  return style;
}

function mapRNProps(props: any) {
  const {
    style,
    accessibilityRole,
    accessibilityLabel,
    accessibilityValue,
    accessibilityState,
    pointerEvents,
    onPress,
    activeOpacity,
    testID,
    disabled,
    ...rest
  } = props || {};

  const mapped: any = {...rest};
  if (style) mapped.style = flattenStyle(style);
  if (accessibilityRole) mapped['data-accessibility-role'] = accessibilityRole;
  if (accessibilityLabel) mapped['aria-label'] = accessibilityLabel;
  if (accessibilityValue) mapped['data-accessibility-value'] = JSON.stringify(accessibilityValue);
  if (accessibilityState) mapped['data-accessibility-state'] = JSON.stringify(accessibilityState);
  if (testID) mapped['data-testid'] = testID;
  if (onPress) mapped.onClick = onPress;
  if (disabled) mapped.disabled = true;
  return mapped;
}

export const View = React.forwardRef<HTMLDivElement, any>(({children, ...props}, ref) => (
  <div ref={ref} {...mapRNProps(props)}>
    {children}
  </div>
));
View.displayName = 'View';

export const Text = React.forwardRef<HTMLSpanElement, any>(({children, onPress, ...props}, ref) => (
  <span ref={ref} {...mapRNProps({...props, onPress})}>
    {children}
  </span>
));
Text.displayName = 'Text';

export const TouchableOpacity = React.forwardRef<HTMLButtonElement, any>(
  ({children, onPress, disabled, ...props}, ref) => (
    <button ref={ref} type="button" onClick={onPress} disabled={disabled} {...mapRNProps(props)}>
      {children}
    </button>
  ),
);
TouchableOpacity.displayName = 'TouchableOpacity';

export const ScrollView = React.forwardRef<HTMLDivElement, any>(
  ({children, contentContainerStyle, ...props}, ref) => (
    <div ref={ref} {...mapRNProps(props)}>
      <div style={flattenStyle(contentContainerStyle)}>{children}</div>
    </div>
  ),
);
ScrollView.displayName = 'ScrollView';

export const Animated = {
  View: React.forwardRef<HTMLDivElement, any>(({children, ...props}, ref) => (
    <div ref={ref} {...mapRNProps(props)}>
      {children}
    </div>
  )),
  Text: React.forwardRef<HTMLSpanElement, any>(({children, ...props}, ref) => (
    <span ref={ref} {...mapRNProps(props)}>
      {children}
    </span>
  )),
  Value: class {
    _value: number;
    constructor(val: number) {
      this._value = val;
    }
    setValue(v: number) {
      this._value = v;
    }
  },
  timing: (_value: any, _config: any) => ({
    start: (cb?: () => void) => cb?.(),
  }),
  spring: (_value: any, _config: any) => ({
    start: (cb?: () => void) => cb?.(),
  }),
  sequence: (animations: any[]) => ({
    start: (cb?: () => void) => {
      for (const a of animations) {
        a.start();
      }
      cb?.();
    },
  }),
  parallel: (animations: any[]) => ({
    start: (cb?: () => void) => {
      for (const a of animations) {
        a.start();
      }
      cb?.();
    },
  }),
};
Animated.View.displayName = 'Animated.View';
Animated.Text.displayName = 'Animated.Text';

export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
  absoluteFillObject: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flatten: flattenStyle,
};

export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default,
};

export default {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
};
