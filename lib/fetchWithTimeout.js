/**
 * fetch com timeout — evita telas presas quando a API/Supabase não responde.
 */
export async function fetchWithTimeout(input, init = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Tempo esgotado ao aguardar resposta (${Math.round(timeoutMs / 1000)}s).`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(message || `Operação expirou (${Math.round(timeoutMs / 1000)}s).`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
