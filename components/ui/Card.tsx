import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { Colors, Radius, Shadow, Spacing } from '../../constants/theme'

interface Props {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  padded?: boolean
}

export default function Card({ children, style, padded = true }: Props) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadow.card,
  },
  padded: { padding: Spacing.lg },
})
