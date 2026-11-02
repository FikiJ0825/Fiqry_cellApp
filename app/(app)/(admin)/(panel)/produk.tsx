import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FontSize, Radius, Font } from '../../../../constants/theme'
import  AdminPlaceholderScreen  from './_components/AdminPlaceholderScreen'
import { Theme, useStyles, useTheme } from '../../../../lib/theme'

export default function AdminProdukScreen() {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const router = useRouter()

  return (
    <AdminPlaceholderScreen
      title="Kelola Produk"
      description="Fitur segera hadir"
      icon="cube-outline"
    >
      <TouchableOpacity
        style={styles.navCard}
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/(admin)/katalog')}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="cube-outline" size={24} color={colors.accent} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navTitle}>Kelola Katalog Produk</Text>
          <Text style={styles.navSubtitle}>Tambah, edit harga, dan aktifkan produk</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navCard}
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/(admin)/banner')}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="image-outline" size={24} color={colors.accent} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navTitle}>Kelola Banner Promo</Text>
          <Text style={styles.navSubtitle}>Tambah, edit, dan atur banner promo</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </AdminPlaceholderScreen>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  navIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: t.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextWrap: {
    flex: 1,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontFamily: Font.semibold,
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  navSubtitle: { fontFamily: Font.regular,
    fontSize: FontSize.sm,
    color: t.colors.textSecondary,
  },
})
