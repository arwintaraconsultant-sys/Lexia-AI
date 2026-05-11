import { SYSTEM_INSTRUCTION } from "./gemini";

export type AIProvider = 'gemini' | 'claude' | 'openai';

export const getAIResponse = async (
  provider: AIProvider,
  prompt: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [], 
  isAgentMode: boolean = false,
  file?: { name: string, type: string, data: string },
  profile?: { name: string, address: string, contact: string }
) => {
  let instruction = isAgentMode 
    ? `${SYSTEM_INSTRUCTION}\n\nMODE AGEN AKTIF: Lakukan analisis yang sangat mendalam. Berikan dasar hukum berlapis, kutip setidaknya 3 peraturan terkait, jelaskan implikasi jangka panjang, dan berikan langkah-langkah prosedural yang sangat detail (step-by-step). Gunakan nada yang lebih proaktif dan investigatif.`
    : SYSTEM_INSTRUCTION;

  if (profile) {
    instruction += `\n\nIDENTITAS KANTOR HUKUM PENGGUNA:
Nama Kantor: ${profile.name}
Alamat: ${profile.address}
Kontak: ${profile.contact}`;
  }

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      prompt,
      history,
      systemInstruction: instruction,
      temperature: isAgentMode ? 0.3 : 0.7,
      file
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Terjadi kesalahan saat memanggil AI API');
  }

  const data = await response.json();
  return data.text;
};

export const enhancePrompt = async (provider: AIProvider, prompt: string) => {
  const instruction = `Tugas Anda adalah memperbaiki dan memperjelas prompt hukum yang diajukan pengguna agar menghasilkan jawaban yang lebih akurat dari AI Hukum.
- Jika prompt terlalu singkat, tambahkan konteks hukum Indonesia yang relevan.
- Jika bahasa tidak formal, ubah menjadi lebih profesional secara hukum.
- Pastikan fokus pada analisis regulasi Indonesia.
- KEMBALIKAN HANYA PROMPT YANG TELAH DIUBAH, TANPA PENJELASAN LAIN.`;

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      prompt: `Tolong perbaiki prompt ini agar lebih baik untuk asisten hukum AI: "${prompt}"`,
      history: [],
      systemInstruction: instruction,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Terjadi kesalahan saat memanggil AI API');
  }

  const data = await response.json();
  return data.text;
};
