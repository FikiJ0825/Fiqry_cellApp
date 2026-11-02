import AsyncStorage from '@react-native-async-storage/async-storage'
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import {
  DarkColors,
  LightColors,
  PastelGelap,
  PastelSet,
  PastelTerang,
  ShadowGelap,
  ShadowTerang,
  ThemeColors,
  ThemeShadow,
} from '../constants/theme'

export type PreferensiTema = 'otomatis' | 'terang' | 'gelap'

export interface Theme {
  colors: ThemeColors
  pastel: PastelSet
  shadow: ThemeShadow
  isDark: boolean
}

interface ThemeContextValue extends Theme {
  preferensi: PreferensiTema
  setPreferensi: (nilai: PreferensiTema) => void
}

const KUNCI = 'tema_preferensi'

const TEMA_TERANG: Theme = { colors: LightColors, pastel: PastelTerang, shadow: ShadowTerang, isDark: false }
const TEMA_GELAP: Theme = { colors: DarkColors, pastel: PastelGelap, shadow: ShadowGelap, isDark: true }

const ThemeContext = createContext<ThemeContextValue>({
  ...TEMA_TERANG,
  preferensi: 'otomatis',
  setPreferensi: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sistem = useColorScheme()
  const [preferensi, setPreferensiState] = useState<PreferensiTema>('otomatis')

  useEffect(() => {
    AsyncStorage.getItem(KUNCI)
      .then((nilai) => {
        if (nilai === 'terang' || nilai === 'gelap' || nilai === 'otomatis') setPreferensiState(nilai)
      })
      .catch(() => {})
  }, [])

  const setPreferensi = useCallback((nilai: PreferensiTema) => {
    setPreferensiState(nilai)
    AsyncStorage.setItem(KUNCI, nilai).catch(() => {})
  }, [])

  const gelap = preferensi === 'gelap' || (preferensi === 'otomatis' && sistem === 'dark')

  const value = useMemo<ThemeContextValue>(
    () => ({ ...(gelap ? TEMA_GELAP : TEMA_TERANG), preferensi, setPreferensi }),
    [gelap, preferensi, setPreferensi],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

/** Buat gaya yang ikut berganti saat tema berubah; `buatStyles` didefinisikan di level modul dan mengembalikan StyleSheet.create(...) */
export function useStyles<T>(buatStyles: (tema: Theme) => T): T {
  const { colors, pastel, shadow, isDark } = useTheme()
  return useMemo(() => buatStyles({ colors, pastel, shadow, isDark }), [buatStyles, colors, pastel, shadow, isDark])
}
