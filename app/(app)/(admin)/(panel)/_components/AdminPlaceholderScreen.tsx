import { Ionicons } from '@expo/vector-icons'
import { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { FontSize, Radius, Font } from '../../../../../constants/theme'
import { Theme, useStyles, useTheme } from '../../../../../lib/theme'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

interface AdminPlaceholderScreenProps {
  title: string
  description: string
  icon: IoniconName
  children?: ReactNode
}

export default function AdminPlaceholderScreen({
  title,
  description,
  icon,
  children,
}: AdminPlaceholderScreenProps) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={48} color={colors.accent} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {children}
    </ScrollView>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: t.colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    backgroundColor: t.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FontSize.xl,
    fontFamily: Font.bold,
    color: t.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: { fontFamily: Font.regular,
    fontSize: FontSize.md,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})
