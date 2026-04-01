import { GoogleGenAI, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. Audio generation will be disabled.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const audioCache: Record<number, string> = {};
const pendingRequests: Record<number, Promise<string>> = {};
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export async function prewarmAudio() {
  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
  for (const n of numbers) {
    getNumberAudio(n).catch(() => {}); // Fire and forget, errors handled in getNumberAudio
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

async function fetchWithRetry(num: number, retries = 3, delay = 1000): Promise<string> {
  const ai = getAI();
  if (!ai) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Произнеси четко и по-детски число: ${num}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    }
  } catch (error: any) {
    if (retries > 0 && (error?.error?.code === 429 || error?.status === "RESOURCE_EXHAUSTED")) {
      console.warn(`Rate limit hit for ${num}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(num, retries - 1, delay * 2);
    }
    throw error;
  }
  return "";
}

export async function getNumberAudio(num: number): Promise<string> {
  if (audioCache[num]) return audioCache[num];
  if (pendingRequests[num]) return pendingRequests[num];

  pendingRequests[num] = fetchWithRetry(num)
    .then(base64 => {
      if (base64) audioCache[num] = base64;
      delete pendingRequests[num];
      return base64;
    })
    .catch(err => {
      delete pendingRequests[num];
      throw err;
    });

  return pendingRequests[num];
}

export async function playAudio(base64Data: string, volume: number = 1) {
  if (!base64Data) {
    // Fallback: simple beep if no audio data
    playSoundEffect('click', volume);
    return;
  }
  
  try {
    const ctx = getAudioContext();
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Gemini TTS returns 16-bit PCM, mono, 24000Hz
    // Ensure buffer length is even for Int16Array
    const buffer = bytes.buffer;
    const pcmLength = Math.floor(buffer.byteLength / 2);
    const pcmData = new Int16Array(buffer, 0, pcmLength);
    
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    if (floatData.length === 0) {
      console.warn("Empty audio data received");
      return;
    }

    const audioBuffer = ctx.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start();
  } catch (e) {
    console.error("Audio playback failed:", e);
  }
}

export function playSoundEffect(type: 'click' | 'match' | 'victory', volume: number = 1) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'click') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } else if (type === 'match') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.2); // C6
      gainNode.gain.setValueAtTime(0.2 * volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } else if (type === 'error') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
      oscillator.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3); // A2
      gainNode.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    } else if (type === 'victory') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.2 * volume, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
    }
  } catch (e) {
    console.error("Sound effect playback failed:", e);
  }
}
