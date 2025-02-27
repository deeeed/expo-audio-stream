import {
  MaterialCommunityIcons,
  FontAwesome,
  Feather,
  Entypo,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useTheme } from "@siteed/design-system";
import { Pressable, StyleProp, ViewStyle, TextStyle } from "react-native";

export interface HeaderIconProps {
  onPress: () => void;
  name: string;
  IconComponent:
    | typeof MaterialCommunityIcons
    | typeof MaterialIcons
    | typeof FontAwesome
    | typeof Feather
    | typeof Entypo
    | typeof Ionicons;
  isActive?: boolean;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  pressedOpacity?: number;
  containerStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<TextStyle>;
  hitSlop?: number;
  tooltip?: string;
}

export function HeaderIcon({
  onPress,
  name,
  IconComponent,
  isActive,
  size = 25,
  activeColor,
  inactiveColor,
  pressedOpacity = 0.5,
  containerStyle,
  iconStyle,
  hitSlop = 8,
  tooltip,
}: HeaderIconProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[{ paddingLeft: 10 }, containerStyle]}
      hitSlop={hitSlop}
      accessibilityLabel={tooltip}
      accessibilityHint={tooltip}
    >
      {({ pressed }) => (
        <IconComponent
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name={name as any}
          size={size}
          style={[
            {
              marginRight: 15,
              opacity: pressed ? pressedOpacity : 1,
              color:
                isActive || pressed
                  ? activeColor ?? theme.colors.primary
                  : inactiveColor ?? theme.colors.text,
            },
            iconStyle,
          ]}
        />
      )}
    </Pressable>
  );
}
