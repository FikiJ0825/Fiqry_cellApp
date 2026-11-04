import dotenv from 'dotenv';
import express from 'express';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidDecode,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

dotenv.config();

/** @type {import('@whiskeysockets/baileys').WASocket | null} */
let waSocket = null;
let whatsappConnected = false;

const AUTH_FOLDER = './auth_info_baileys';
const PORT = process.env.PORT || 3001;

/**
 * Normalisasi nomor telepon ke format JID WhatsApp.
 * @param {string} nomor
 * @returns {string}
 */
function normalizeToJid(nomor) {
  let digits = nomor.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  }
  return `${digits}@s.whatsapp.net`;
}

/**
 * Ambil teks dari pesan WhatsApp (conversation atau extendedTextMessage).
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} message
 * @returns {string | null}
 */
function getMessageText(message) {
  const content = message.message;
  if (!content) return null;

  if (typeof content.conversation === 'string' && content.conversation.trim()) {
    return content.conversation.trim();
  }

  const extendedText = content.extendedTextMessage?.text;
  if (typeof extendedText === 'string' && extendedText.trim()) {
    return extendedText.trim();
  }

  return null;
}

/**
 * Teruskan balasan transaksi ke Supabase webhook. Memakai WA_BRIDGE_SECRET (secret bersama yang
 * stabil), bukan kunci service role yang bisa diganti Supabase sewaktu-waktu. Gangguan sementara
 * (jaringan putus / 5xx) diulang; 4xx tidak diulang karena itu salah konfigurasi, bukan gangguan.
 * @param {string} pesan
 */
async function forwardTransactionReplyToWebhook(pesan) {
  const url = process.env.SUPABASE_WEBHOOK_URL;
  const secret = process.env.WA_BRIDGE_SECRET;

  if (!url || !secret) {
    console.warn(
      'Webhook tidak dikirim: SUPABASE_WEBHOOK_URL atau WA_BRIDGE_SECRET belum diset.',
    );
    return;
  }

  const jedaUlang = [1000, 3000];

  for (let percobaan = 0; percobaan <= jedaUlang.length; percobaan++) {
    const sisaUlang = percobaan < jedaUlang.length;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nomor: process.env.WA_CENTER_LID ? `${process.env.WA_CENTER_LID}@lid` : null,
          pesan,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        console.log(
          `Webhook balasan transaksi berhasil (status ${response.status}).`,
        );
        return;
      }

      const responseBody = await response.text().catch(() => '');
      console.error(
        `Webhook balasan transaksi gagal (status ${response.status}): ${responseBody || '(body kosong)'}`,
      );
      if (response.status < 500) return;
    } catch (err) {
      console.error('Gagal kirim webhook balasan transaksi:', err);
    }

    if (sisaUlang) {
      console.warn(`Mencoba kirim ulang webhook dalam ${jedaUlang[percobaan] / 1000} detik...`);
      await new Promise((selesai) => setTimeout(selesai, jedaUlang[percobaan]));
    }
  }
}

/**
 * Middleware autentikasi Bearer token.
 */
function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const secret = process.env.WA_BRIDGE_SECRET;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice('Bearer '.length);
  if (!secret || token !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/**
 * Membuat koneksi WhatsApp dan mengembalikan socket instance.
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
async function startWhatsApp() {
  console.log('Memulai koneksi WhatsApp...');
  console.log(`Memuat session auth dari ${AUTH_FOLDER}...`);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  console.log('Mengambil versi WhatsApp Web terbaru...');
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' });

  console.log('Membuat socket WhatsApp...');
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Menunggu scan QR...');
      console.log('Buka WhatsApp di HP → Linked Devices → Link a Device, lalu scan QR di bawah:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      whatsappConnected = false;

      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : undefined;

      if (statusCode === DisconnectReason.loggedOut) {
        console.error(
          'WhatsApp logout. Session tidak valid lagi — hapus folder auth_info_baileys dan scan QR ulang.',
        );
        return;
      }

      console.warn(
        `Koneksi terputus (kode: ${statusCode ?? 'unknown'}). Mencoba reconnect...`,
      );
      startWhatsApp()
        .then((newSock) => {
          waSocket = newSock;
        })
        .catch((err) => {
          console.error('Gagal reconnect WhatsApp:', err);
        });
      return;
    }

    if (connection === 'open') {
      whatsappConnected = true;
      const me = sock.user;
      const phone = me?.id
        ? (jidDecode(me.id)?.user ?? me.id.split('@')[0])
        : 'tidak diketahui';
      console.log(`WhatsApp terhubung! Nomor: ${phone}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const centerLid = process.env.WA_CENTER_LID
      ? `${process.env.WA_CENTER_LID}@lid`
      : null;

    for (const message of messages) {
      if (message.key.fromMe) continue;

      const text = getMessageText(message);

      // DEBUG sementara: log data mentah sebelum filter nomor pengirim
      console.log('=== PESAN MASUK ===');
      console.log('Raw remoteJid: ' + message.key.remoteJid);
      console.log(
        'Participant (jika ada, untuk pesan grup/LID): ' +
          (message.key.participant ?? '(tidak ada)'),
      );
      console.log('Isi pesan: ' + (text ?? '(tidak ada teks)'));
      console.log('======================');

      if (!text) continue;

      const remoteJid = message.key.remoteJid;
      if (!remoteJid) continue;

      if (!centerLid || remoteJid !== centerLid) {
        console.info(
          `Pesan masuk di-skip (bukan dari WA_CENTER_LID): ${remoteJid}`,
        );
        continue;
      }

      // Semua pesan dari WA Center diteruskan apa adanya. Klasifikasi (sukses / gagal / diproses / abaikan)
      // dilakukan di wa-webhook, supaya balasan gagal seperti "kode PIN Anda salah" juga sampai ke sana.
      console.log(`Pesan dari WA Center, meneruskan ke webhook: ${text}`);
      await forwardTransactionReplyToWebhook(text);
    }
  });

  console.log('Event listener socket siap.');
  return sock;
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    whatsapp_connected: whatsappConnected,
  });
});

app.post('/send-message', verifyAuth, async (req, res) => {
  const { nomor_tujuan, pesan } = req.body ?? {};

  if (!nomor_tujuan || !pesan) {
    const missing = [];
    if (!nomor_tujuan) missing.push('nomor_tujuan');
    if (!pesan) missing.push('pesan');
    return res.status(400).json({
      error: `Field wajib tidak ada: ${missing.join(', ')}`,
    });
  }

  if (!waSocket || !whatsappConnected) {
    return res.status(503).json({ error: 'WhatsApp belum terhubung' });
  }

  const jid = normalizeToJid(String(nomor_tujuan));

  try {
    await waSocket.sendMessage(jid, { text: String(pesan) });
    return res.status(200).json({ success: true, message: 'Pesan terkirim' });
  } catch (err) {
    console.error('Gagal kirim pesan WhatsApp:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Gagal mengirim pesan',
    });
  }
});

console.log('=== WA Bridge: Inisialisasi ===');

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

startWhatsApp()
  .then((sock) => {
    waSocket = sock;
    console.log('Socket WhatsApp dibuat. Menunggu koneksi terbuka...');
  })
  .catch((err) => {
    console.error('Gagal memulai WhatsApp bridge:', err);
  });

export { waSocket, startWhatsApp };
