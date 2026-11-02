import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { Theme, useStyles, useTheme } from '../../lib/theme'

export default function Loading() {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  return (
    <View style={styles.pusat}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  pusat: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background },
})
