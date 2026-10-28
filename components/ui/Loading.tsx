import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Colors } from '../../constants/theme'

export default function Loading() {
  return (
    <View style={styles.pusat}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  pusat: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
})
