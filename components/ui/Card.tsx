import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { Radius, Spacing } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  padded?: boolean
}

export default function Card({ children, style, padded = true }: Props) {
  const styles = useStyles(buatStyles)
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
}

const buatStyles = (t: Theme) => StyleSheet.create({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadow.card,
  },
  padded: { padding: Spacing.lg },
})
