import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { FontSize, Radius, Spacing, Font } from '../../constants/theme'
import { s } from '../../lib/skala'
import { Theme, useStyles, useTheme } from '../../lib/theme'

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string
  ikon?: IoniconName
  error?: string
  /** Kolom password: tampilkan tombol mata untuk melihat/menyembunyikan isi */
  kataSandi?: boolean
  wadah?: StyleProp<ViewStyle>
}

export default function Input({
  label,
  ikon,
  error,
  kataSandi = false,
  wadah,
  editable = true,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const styles = useStyles(buatStyles)
  const { colors } = useTheme()
  const [fokus, setFokus] = useState(false)
  const [tampil, setTampil] = useState(false)

  return (
    <View style={wadah}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.kotak,
          fokus && styles.kotakFokus,
          !!error && styles.kotakError,
          !editable && styles.kotakNonaktif,
        ]}
      >
        {ikon ? <Ionicons name={ikon} size={s(20)} color={fokus ? colors.primary : colors.grey} /> : null}
        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={kataSandi && !tampil}
          placeholderTextColor={colors.grey}
          onFocus={(e) => {
            setFokus(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFokus(false)
            onBlur?.(e)
          }}
          style={styles.input}
        />
        {kataSandi ? (
          <Pressable
            onPress={() => setTampil((prev) => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tampil ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            <Ionicons name={tampil ? 'eye-off-outline' : 'eye-outline'} size={s(22)} color={colors.grey} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    fontFamily: Font.semibold,
    color: t.colors.textPrimary,
    marginBottom: s(8),
  },
  kotak: {
    minHeight: s(52),
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: s(16),
    backgroundColor: t.colors.surface,
  },
  kotakFokus: { borderColor: t.colors.accent },
  kotakError: { borderColor: t.colors.error },
  kotakNonaktif: { opacity: 0.6 },
  input: { fontFamily: Font.regular, flex: 1, paddingVertical: s(12), fontSize: FontSize.md, color: t.colors.textPrimary },
  error: { fontFamily: Font.regular, fontSize: FontSize.xs, color: t.colors.error, marginTop: 4 },
})
