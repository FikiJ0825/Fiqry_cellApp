import { ComponentRef, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { FontSize, Radius, Spacing, Font } from '../../constants/theme'
import { Theme, useStyles } from '../../lib/theme'

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
  editable?: boolean
  panjang?: number
}

/**
 * Kolom PIN bergaya kotak. TextInput-nya tersembunyi; ketukan pada kotak memanggil focus() lewat ref.
 * Jangan mengandalkan ketukan langsung ke TextInput ber-opacity 0: iOS mengabaikan sentuhan pada view
 * dengan alpha ~0, sehingga keypad tidak pernah muncul.
 */
export default function PinInput({ value, onChange, label, editable = true, panjang = 6 }: Props) {
  const styles = useStyles(buatStyles)
  const [fokus, setFokus] = useState(false)
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null)
  const posisiAktif = Math.min(value.length, panjang - 1)

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={styles.baris}
        onPress={() => inputRef.current?.focus()}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'PIN'}, ketuk untuk mengisi`}
      >
        {Array.from({ length: panjang }, (_, i) => (
          <View
            key={i}
            style={[styles.kotak, fokus && i === posisiAktif && styles.kotakAktif, !editable && styles.nonaktif]}
          >
            {i < value.length ? <View style={styles.titik} /> : null}
          </View>
        ))}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, panjang))}
          keyboardType="number-pad"
          maxLength={panjang}
          editable={editable}
          caretHidden
          autoComplete="off"
          autoCorrect={false}
          contextMenuHidden
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          pointerEvents="none"
          style={styles.tersembunyi}
        />
      </Pressable>
    </View>
  )
}

const buatStyles = (t: Theme) => StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    fontFamily: Font.semibold,
    color: t.colors.textPrimary,
    marginBottom: 6,
  },
  baris: { flexDirection: 'row', gap: Spacing.sm },
  kotak: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: Radius.md,
    backgroundColor: t.colors.surface,
  },
  kotakAktif: { borderColor: t.colors.accent, borderWidth: 2 },
  nonaktif: { opacity: 0.6 },
  titik: { width: 12, height: 12, borderRadius: Radius.full, backgroundColor: t.colors.primaryDark },
  tersembunyi: { ...StyleSheet.absoluteFill, opacity: 0 },
})
