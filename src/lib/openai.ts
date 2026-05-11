import { SYSTEM_INSTRUCTION } from "./gemini";

export const getOpenAIResponse = async (
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
    instruction += `\n\nIDENTITAS KANTOR HUKUM PENGGUNA (Gunakan data ini secara otomatis):
Nama Kantor: ${profile.name}
Alamat: ${profile.address}
Kontak: ${profile.contact}

INSTRUKSI KHUSUS PEMBUATAN DRAF:
1. Anda WAJIB menggunakan identitas kantor hukum di atas di dalam isi dokumen. JANGAN gunakan placeholder seperti "[Nama Law Firm]", "[Alamat]", atau "[Identitas Penentu]".
2. HANYA kembalikan bagian ISI (BODY) dokumen hukum saja. 
3. JANGAN menyertakan KOP SURAT (Letterhead), LOGO, atau FOOTER dalam jawaban Anda, karena sistem akan menambahkannya secara otomatis menggunakan template profesional.
4. Gunakan format Markdown yang bersih.`;
  }

  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      history,
      systemInstruction: instruction,
      temperature: isAgentMode ? 0.3 : 0.7,
      file
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Terjadi kesalahan saat memanggil OpenAI API');
  }

  const data = await response.json();
  return data.text;
};

export const enhancePromptWithOpenAI = async (prompt: string) => {
  const instruction = `Tugas Anda adalah memperbaiki dan memperjelas prompt hukum yang diajukan pengguna agar menghasilkan jawaban yang lebih akurat dari AI Hukum.
- Jika prompt terlalu singkat, tambahkan konteks hukum Indonesia yang relevan.
- Jika bahasa tidak formal, ubah menjadi lebih profesional secara hukum.
- Pastikan fokus pada analisis regulasi Indonesia.
- KEMBALIKAN HANYA PROMPT YANG TELAH DIUBAH, TANPA PENJELASAN LAIN.`;

  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `Tolong perbaiki prompt ini agar lebih baik untuk asisten hukum AI: "${prompt}"`,
      history: [],
      systemInstruction: instruction,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Terjadi kesalahan saat memanggil OpenAI API');
  }

  const data = await response.json();
  return data.text;
};
