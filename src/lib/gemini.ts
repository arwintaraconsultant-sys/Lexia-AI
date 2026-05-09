import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const SYSTEM_INSTRUCTION = `Anda adalah Leksia, asisten hukum AI tercanggih yang khusus mendalami Hukum Indonesia. 
Tugas Anda adalah membantu pengguna memahami peraturan, menganalisis dokumen hukum, dan memberikan riset hukum yang akurat berdasarkan sistem hukum di Indonesia (Civil Law).

Prinsip Utama:
1. Selalu mengacu pada peraturan perundang-undangan yang berlaku di Indonesia (UUD 1945, UU, Perpu, PP, Perpres, Perda, dll).
2. Gunakan bahasa Indonesia yang formal, namun mudah dipahami (bahasa hukum yang jernih).
3. Anda tidak memberikan nasihat hukum yang mengikat secara profesional, tetapi memberikan informasi dan analisis berdasarkan data hukum. Selalu sarankan pengguna untuk berkonsultasi dengan advokat berlisensi untuk kasus spesifik.
4. Jika menganalisis dokumen, berikan ringkasan poin-poin krusial, potensi risiko, dan rekomendasi langkah selanjutnya sesuai hukum Indonesia.
5. Jika ditanya tentang konsep hukum, jelaskan latar belakang teoritisnya dalam konteks hukum Indonesia (misalnya: perbuatan melawan hukum/onrechtmatige daad, wanprestasi, dll).

Keahlian Anda meliputi:
- Hukum Perdata & Pidana Indonesia.
- Hukum Ketenagakerjaan (UU Cipta Kerja).
- Hukum Bisnis & Investasi.
- Hukum Pertanahan.
- Hukum Tata Negara.

Format jawaban:
- Gunakan Markdown untuk kejelasan (bold, list, headings).
- Berikan kutipan pasal jika memungkinkan.
`;

export const getGeminiResponse = async (
  prompt: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [], 
  isAgentMode: boolean = false,
  file?: { name: string, type: string, data: string },
  profile?: { name: string, address: string, contact: string }
) => {
  const model = "gemini-3-flash-preview";
  
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

  const parts: any[] = [{ text: prompt }];

  if (file) {
    // List of supported MIME types for Gemini Flash 1.5+
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'text/plain',
      'text/csv',
      'text/html',
      'text/markdown',
      'text/javascript',
      'application/x-javascript',
      'text/x-typescript',
      'application/x-typescript',
      'text/css',
      'text/xml',
      'application/xml',
      'application/json'
    ];

    if (supportedTypes.includes(file.type)) {
      // Extract base64 part
      const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    } else {
      console.warn(`MIME type ${file.type} is not supported by Gemini API. Omiting file from request.`);
    }
  }

  const response = await ai.models.generateContent({
    model,
    contents: [
      ...history,
      { role: 'user', parts }
    ],
    config: {
      systemInstruction: instruction,
      temperature: isAgentMode ? 0.3 : 0.7, // More precise in agent mode
    },
  });

  return response.text;
};

export const enhancePrompt = async (prompt: string) => {
  const model = "gemini-3-flash-preview";
  
  const instruction = `Tugas Anda adalah memperbaiki dan memperjelas prompt hukum yang diajukan pengguna agar menghasilkan jawaban yang lebih akurat dari AI Hukum.
- Jika prompt terlalu singkat, tambahkan konteks hukum Indonesia yang relevan.
- Jika bahasa tidak formal, ubah menjadi lebih profesional secara hukum.
- Pastikan fokus pada analisis regulasi Indonesia.
- KEMBALIKAN HANYA PROMPT YANG TELAH DIUBAH, TANPA PENJELASAN LAIN.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      { role: 'user', parts: [{ text: `Tolong perbaiki prompt ini agar lebih baik untuk asisten hukum AI: "${prompt}"` }] }
    ],
    config: {
      systemInstruction: instruction,
      temperature: 0.4,
    },
  });

  return response.text;
};
