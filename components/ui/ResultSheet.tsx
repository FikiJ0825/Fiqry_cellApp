import { ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IoniconName } from '../../constants/produk'
import { Colors, FontSize, FontWeight, PastelNama, Radius, Spacing } from '../../constants/theme'
import Button from './Button'
import IconTile from './IconTile'

interface Aksi {
  label: string
  onPress: () => void
  loading?: boolean
}

interface Props {
  visible: boolean
  ikon: IoniconName
  warna: PastelNama
  judul: string
  pesan?: string
  /** Isi tambahan di antara pesan dan tombol, mis. rincian pembelian */
  children?: ReactNode
  aksi: Aksi
  aksiKedua?: Aksi
  onTutup: () => void
}

/** Lembar dari bawah untuk konfirmasi dan hasil (sukses/gagal), pengganti Alert.alert */
export default function ResultSheet({ visible, ikon, warna, judul, pesan, children, aksi, aksiKedua, onTutup }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onTutup} statusBarTranslucent>
      <View style={styles.wadah}>
        <Pressable style={styles.latar} onPress={onTutup} accessibilityLabel="Tutup" />
        <View style={[styles.lembar, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.pegangan} />
          <IconTile ikon={ikon} warna={warna} size={64} />
          <Text style={styles.judul}>{judul}</Text>
          {pesan ? <Text style={styles.pesan}>{pesan}</Text> : null}
          {children ? <View style={styles.isi}>{children}</View> : null}
          <Button label={aksi.label} onPress={aksi.onPress} loading={aksi.loading} style={styles.tombol} />
          {aksiKedua ? (
            <Button
              label={aksiKedua.label}
              onPress={aksiKedua.onPress}
              loading={aksiKedua.loading}
              variant="soft"
              style={styles.tombol}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wadah: { flex: 1, justifyContent: 'flex-end' },
  latar: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(43,30,32,0.55)' },
  lembar: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  pegangan: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  judul: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  pesan: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  isi: { alignSelf: 'stretch', marginTop: Spacing.lg },
  tombol: { alignSelf: 'stretch', marginTop: Spacing.md },
})
