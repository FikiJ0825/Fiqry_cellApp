import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native'
import { IoniconName } from '../../constants/produk'
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../constants/theme'

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
        {ikon ? <Ionicons name={ikon} size={18} color={fokus ? Colors.primary : Colors.grey} /> : null}
        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={kataSandi && !tampil}
          placeholderTextColor={Colors.grey}
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
            <Ionicons name={tampil ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.grey} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  kotak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
  },
  kotakFokus: { borderColor: Colors.primary },
  kotakError: { borderColor: Colors.error },
  kotakNonaktif: { opacity: 0.6 },
  input: { flex: 1, paddingVertical: 12, fontSize: FontSize.md, color: Colors.textPrimary },
  error: { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },
})
