/** Caminho do som customizado (MP3, WAV ou OGG). Coloque o arquivo em `public/sounds/`. */
const CUSTOM_SOUND_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_NEW_ORDER_SOUND) ||
  '/sounds/novo-pedido.mp3';

let cachedAudio = null;
let customSoundUnavailable = false;

function beep(ctx, frequency, startAt, duration = 0.22) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.value = 0.12;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

function playFallbackBeep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const t0 = ctx.currentTime;
    beep(ctx, 880, t0);
    beep(ctx, 1175, t0 + 0.28);
    window.setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch {
    /* autoplay pode falhar sem gesto do usuário */
  }
}

function getCustomAudio() {
  if (typeof window === 'undefined' || customSoundUnavailable) return null;
  try {
    const src = new URL(CUSTOM_SOUND_URL, window.location.origin).href;
    if (!cachedAudio || cachedAudio.src !== src) {
      cachedAudio = new Audio(src);
      cachedAudio.preload = 'auto';
      cachedAudio.volume = 0.9;
    }
    return cachedAudio;
  } catch {
    return null;
  }
}

/** Som de novo pedido: arquivo em `public/sounds/` ou bipe sintético de fallback. */
export function playNewOrderSound() {
  if (typeof window === 'undefined') return;

  const audio = getCustomAudio();
  if (!audio) {
    playFallbackBeep();
    return;
  }

  audio.currentTime = 0;
  const playPromise = audio.play();
  if (!playPromise) return;

  playPromise.catch(() => {
    customSoundUnavailable = true;
    cachedAudio = null;
    playFallbackBeep();
  });
}

export async function requestAdminNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function notifyNewOrder(order) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const total = Number(order?.total || 0);
  const totalLabel = total > 0 ? `R$ ${total.toFixed(2).replace('.', ',')}` : '';
  const body = [order?.clienteNome, totalLabel].filter(Boolean).join(' · ');

  try {
    const notification = new Notification('Novo pedido no cardápio', {
      body: body || `Pedido #${order?.id || ''}`,
      tag: `nimbus-order-${order?.id || Date.now()}`,
    });
    notification.onclick = () => {
      window.focus();
      if (window.location.pathname !== '/admin/pedidos') {
        window.location.href = '/admin/pedidos';
      }
      notification.close();
    };
  } catch {
    /* ignore */
  }
}
