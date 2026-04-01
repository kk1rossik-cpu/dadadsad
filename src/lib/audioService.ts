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
let musicMasterGain: GainNode | null = null;
let musicInterval: number | null = null;

const words: Record<number, string> = {
  1: "один", 2: "два", 3: "три", 4: "четыре", 5: "пять",
  6: "шесть", 7: "семь", 8: "восемь", 9: "девять", 10: "десять"
};

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

let isQuotaExhausted = false;

export function testVoice(volume: number = 1) {
  speakWithWebSpeech(1, volume);
}

export function playNumberVoice(num: number, volume: number) {
  console.log(`DEBUG: playNumberVoice for ${num}, cache exists: ${!!audioCache[num]}`);
  
  // 1. If we have it in cache, play the high-quality version
  if (audioCache[num]) {
    console.log(`DEBUG: Playing cached audio for ${num}`);
    playAudio(audioCache[num], volume, num);
  } else {
    // 2. Otherwise, use Web Speech IMMEDIATELY (no delay for kids)
    console.log(`DEBUG: No cache for ${num}, using Web Speech fallback`);
    speakWithWebSpeech(num, volume);
    // 3. And fetch the high-quality version for the next time
    getNumberAudio(num).then(() => {
      console.log(`DEBUG: Successfully cached audio for ${num} after fallback`);
    }).catch((err) => {
      console.error(`DEBUG: Failed to cache audio for ${num}:`, err);
    });
  }
}

export function resumeAudioContext() {
  getAudioContext();
}

export function startBackgroundMusic(volume: number = 0.15) {
  try {
    const ctx = getAudioContext();
    if (musicInterval) return; // Already playing

    musicMasterGain = ctx.createGain();
    musicMasterGain.gain.setValueAtTime(volume, ctx.currentTime);
    musicMasterGain.connect(ctx.destination);

    // Simple, happy "music box" melody: C5, E5, G5, F5, E5, D5, C5
    const melody = [523.25, 659.25, 783.99, 698.46, 659.25, 587.33, 523.25];
    let noteIndex = 0;

    const playNote = () => {
      if (!musicMasterGain) return;
      
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      
      osc.type = 'sine'; // Softest sound
      osc.frequency.setValueAtTime(melody[noteIndex], ctx.currentTime);
      
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.connect(g);
      g.connect(musicMasterGain);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.6);
      
      noteIndex = (noteIndex + 1) % melody.length;
    };

    // Play a note every 2 seconds for a calm, pleasant atmosphere
    playNote();
    musicInterval = window.setInterval(playNote, 2000);
    
  } catch (e) {
    console.error("Failed to start background music:", e);
  }
}

export function stopBackgroundMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  if (musicMasterGain) {
    musicMasterGain.gain.exponentialRampToValueAtTime(0.001, getAudioContext().currentTime + 0.5);
    setTimeout(() => {
      musicMasterGain = null;
    }, 600);
  }
}

export function updateMusicVolume(volume: number) {
  if (musicMasterGain) {
    musicMasterGain.gain.setTargetAtTime(volume, getAudioContext().currentTime, 0.1);
  }
}

export async function prewarmAudio() {
  const ai = getAI();
  if (!ai) {
    console.warn("Audio pre-warming skipped: No API Key found.");
    return;
  }

  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
  for (const n of numbers) {
    if (isQuotaExhausted) break;

    getNumberAudio(n).catch(err => {
      if (err?.status === "RESOURCE_EXHAUSTED" || err?.message?.includes("429")) {
        isQuotaExhausted = true;
      }
    });
    // Very safe delay for free tier
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

async function fetchWithRetry(num: number, retries = 2, delay = 3000): Promise<string> {
  const ai = getAI();
  if (!ai || isQuotaExhausted) return "";

  try {
    console.log(`DEBUG: Requesting Gemini TTS for ${num} with mama-style prompt`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Скажи очень ласково, нежно и по-доброму, как мама ребенку, только одно слово: ${words[num] || num}` }] }],
      config: {
        responseModalities: ['AUDIO'],
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
    const isRateLimit = error?.error?.code === 429 || error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("429");
    
    if (isRateLimit) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(num, retries - 1, delay * 2);
      } else {
        isQuotaExhausted = true;
        console.warn("Gemini API quota exhausted. Falling back to sound effects.");
      }
    } else {
      console.error(`Error fetching audio for ${num}:`, error);
    }
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

function speakWithWebSpeech(num: number, volume: number) {
  if (!('speechSynthesis' in window)) {
    console.error("SpeechSynthesis not supported in this browser");
    return;
  }
  
  const speak = () => {
    try {
      window.speechSynthesis.cancel();
      
      const text = words[num] || num.toString();
      console.log(`DEBUG: WebSpeech text for ${num} is "${text}"`);
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set properties for a more pleasant, child-friendly tone
      utterance.lang = 'ru-RU';
      utterance.volume = volume;
      utterance.rate = 0.85; // Slightly slower for a gentler feel
      utterance.pitch = 1.3; // Higher pitch for a friendlier, more "feminine/child-like" tone

      // Find the best possible Russian voice
      const voices = window.speechSynthesis.getVoices();
      
      // Prioritize high-quality natural/neural voices if available
      let selectedVoice = voices.find(v => 
        (v.lang.startsWith('ru') || v.lang === 'ru-RU') && 
        /natural|neural|google|female|girl|milena|katya|irina|alina|tatyana/i.test(v.name)
      );
      
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('ru') || v.lang === 'ru-RU');
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log("Selected voice:", selectedVoice.name);
      } else {
        console.warn("No Russian voice found, using default");
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("SpeechSynthesis.speak error:", e);
    }
  };

  // Aggressive initialization
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      speak();
      window.speechSynthesis.onvoiceschanged = null;
    };
  } else {
    speak();
  }
}

export async function playAudio(base64Data: string, volume: number = 1, num?: number) {
  console.log(`playAudio: num=${num}, hasData=${!!base64Data}`);
  
  // If no data, use Web Speech immediately
  if (!base64Data) {
    if (num !== undefined) {
      speakWithWebSpeech(num, volume);
    } else {
      playSoundEffect('click', volume);
    }
    return;
  }
  
  try {
    const ctx = getAudioContext();
    
    // If context is suspended, try to resume it
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // If still suspended (common on some mobile browsers if not in direct click handler),
    // fallback to Web Speech which is more reliable for "out of tick" calls
    if (ctx.state === 'suspended' && num !== undefined) {
      console.warn("AudioContext still suspended, falling back to Web Speech");
      speakWithWebSpeech(num, volume);
      return;
    }

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Gemini TTS returns 16-bit PCM, mono, 24000Hz
    // Use a more robust conversion to avoid alignment issues
    const pcmLength = Math.floor(len / 2);
    const floatData = new Float32Array(pcmLength);
    for (let i = 0; i < pcmLength; i++) {
      // Little-endian 16-bit PCM
      const low = bytes[i * 2];
      const high = bytes[i * 2 + 1];
      let s = low | (high << 8);
      if (s & 0x8000) s -= 0x10000;
      floatData[i] = s / 32768.0;
    }

    if (floatData.length === 0) return;

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
    // Final fallback
    if (num !== undefined) speakWithWebSpeech(num, volume);
  }
}

export function playSoundEffect(type: 'click' | 'match' | 'victory' | 'error', volume: number = 1) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'click') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05 * volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } else if (type === 'match') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      oscillator.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.2); // E6
      gainNode.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } else if (type === 'error') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
      oscillator.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3); // A2
      gainNode.gain.setValueAtTime(0.05 * volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
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
