import { createHmac, randomUUID } from 'crypto';
import axios from 'axios';

const URL_SECRET = 'https://papago.naver.com/main.6b997394aeac2d5eb831.chunk.js';
const URL_MAKE_ID = 'https://papago.naver.com/apis/tts/makeID/';
const URL_TTS = 'https://papago.naver.com/apis/tts/';
const URL_DETECT_LANG = 'https://papago.naver.com/apis/langs/dect/';

const SPEACKER_MAP: { [key: string]: string } = {
    'ko_male': 'jinho',
    'ko_female': 'kyuri',
    'en_male': 'matt',
    'en_female': 'clara',
    'ja_male': 'shinji',
    'ja_female': 'yuri',
    'zh-cn_male': 'liangliang',
    'zh-cn_female': 'meimei',
    'zh-tw_male': 'kuanlin',
    'zh-tw_female': 'chiahua',
    'es_male': 'jose',
    'es_female': 'carmen',
    'fr_male': 'louis',
    'fr_female': 'roxane',
    'de_male': 'tim',
    'de_female': 'lena',
    'ru_male': 'aleksei',
    'ru_female': 'vera',
}

export type Gender = 'male' | 'female';
export type LanguageCode = 'ko' | 'en' | 'ja' | 'zh-tw' | 'zh-cn' | 'es' | 'fr' | 'de' | 'ru';

function clamp(x: number, min: number, max: number) {
    if(min > max) return clamp(x, max, min);
    if(x > max) x = max;
    if(x < min) x = min;
    return x;
}

function remap(x: number, from: number, to: number) {
    return from + (to - from) * x;
}

async function getAutorization(url: string, timestamp: number) {
    const hmacSecretCode = await axios.get(URL_SECRET);
    
    const secret = String(hmacSecretCode.data).split('Authorization:')[1].split('HmacMD5(')[1].split(/, ?"/)[1].split('"')[0];
    const uuid = randomUUID();
    const hmac = createHmac('md5', secret)
        .update(`${uuid}\n${url}\n${timestamp}`)
        .digest('base64');

    return `PPG ${uuid}:${hmac}`;
}

export async function detectLanguage(query: string) {
    const timestamp = Date.now();
    const authorization = await getAutorization(URL_DETECT_LANG, timestamp);
    
    const data = (await axios.post(URL_DETECT_LANG, new URLSearchParams({ query }), { 
        headers: {
            'Authorization': authorization,
            'Timestamp': timestamp
        } 
    })).data;
    return String(data.langCode) as LanguageCode;
}

export async function createTTS(text: string, lang: LanguageCode | 'auto' = 'auto', gender: Gender = 'female', alpha = 1, pitch = 1, speed = 1) {
    const timestamp = Date.now();
    const authorization = await getAutorization(URL_MAKE_ID, timestamp);

    if(lang == 'auto') lang = await detectLanguage(text);

    const params = new URLSearchParams({
        alpha: remap(clamp(alpha, 0, 2) / 2, 5, -5).toFixed(0),
        pitch: remap(clamp(pitch, 0, 2) / 2, 5, -5).toFixed(0),
        speed: remap(clamp(speed, 0, 2) / 2, 5, -5).toFixed(0),
        speaker: SPEACKER_MAP[`${lang.toLowerCase()}_${gender.toLowerCase()}`] ?? SPEACKER_MAP['ko-female'],
        text
    });

    const data = (await axios.post(URL_MAKE_ID, params, { 
        headers: {
            'Authorization': authorization,
            'Timestamp': timestamp
        } 
    })).data;
    return URL_TTS + data.id;
}