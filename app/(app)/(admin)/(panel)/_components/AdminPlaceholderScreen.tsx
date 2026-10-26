import { Ionicons } from '@expo/vector-icons'
import { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Colors, FontSize, Radius } from '../../../../../constants/theme'

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
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={48} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})
