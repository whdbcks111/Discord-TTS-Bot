import { createHmac, randomUUID } from 'crypto';
import axios from 'axios';
import { readFileSync } from 'fs';
import path from 'path';
import { calculate } from './calculator';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/11.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
]

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
};

type MacroList = ({ regex: string, replaceValue: string, lang?: string })[];

const MACRO_LIST: MacroList = JSON.parse(readFileSync(path.join(__dirname, '../../data/macro.json')).toString());
const hmacSecretCache: { value: string | null, expirationDate: number } = { value: null, expirationDate: 0 };

export const languageCodes: [string, string][] = [
    ['auto', '자동'], 
    ['ko', '한국어'], 
    ['en', '영어'], 
    ['ja', '일본어'], 
    ['zh-tw', '중국어(번체)'], 
    ['zh-cn', '중국어(간체)'], 
    ['es', '스페인어'], 
    ['fr', '프랑스어'], 
    ['de', '독일어'], 
    ['ru', '러시아어']
];

export type Gender = 'male' | 'female';

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

    /*
    if(Date.now() > hmacSecretCache.expirationDate) {
        const hmacSecretHTML = await (axios.get(URL_SECRET).catch(_ => null));
        const parsedSecret = hmacSecretHTML ? 
            String(hmacSecretHTML.data)
                .split('Authorization:')[1]
                .split('HmacMD5(')[1]
                .split(/, ?"/)[1]
                .split('"')[0] 
            : null;

        if(parsedSecret !== null) hmacSecretCache.value = parsedSecret;
    }


    const uuid = randomUUID();
    const hmac = createHmac('md5', hmacSecretCache.value ?? '')
        .update(`${uuid}\n${url}\n${timestamp}`)
        .digest('base64');

    return `PPG ${uuid}:${hmac}`;*/

    const mainUrl =
      'https://papago.naver.com/main' +
      (await (await fetch('https://papago.naver.com')).text())
        .split(`<script type="text/javascript" src="/main`)[1]
        .split(`"`)[0];
    const secretData = await (await fetch(mainUrl)).text();
    const uuid = randomUUID();
    const secret = secretData
      .split(`p.a.HmacMD5(t+"\\n"+e.split("?")[0]+"\\n"+n,"`)[1]
      .split('"')[0];
    const hmac = createHmac('md5', secret);
    const hash = hmac
      .update(`${uuid}\n${url.split('?')[0]}\n${timestamp}`)
      .digest('base64');
    return `PPG ${uuid}:${hash}`;
}

export async function detectLanguage(query: string) {
    const timestamp = Date.now();
    const authorization = await getAutorization(URL_DETECT_LANG, timestamp);
    
    const data = (await axios.post(URL_DETECT_LANG, new URLSearchParams({ query }), { 
        headers: {
            'Authorization': authorization,
            'Timestamp': timestamp,
            'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
        } 
    }).catch(_ => ({ data: '' }))).data;

    let langCode = String(data.langCode);
    if(!languageCodes.some(code => code[0] === langCode)) {
        langCode = (query.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g)?.length ?? 0) >= (query.match(/[a-zA-Z]/g)?.length ?? 0) ? 'ko' : 'es';
    }

    return langCode;
}

export function convertTTSMessage(msg: string, langCode: string) {

    for(let macro of MACRO_LIST) {
        if(macro.lang && macro.lang != langCode) continue; 
        msg = msg.replace(new RegExp(macro.regex, 'g'), target => {
            let result = macro.replaceValue
                .replace(/\{[^{}]+\}/g, str => calculate(
                    str.slice(1, -1).replace(/length/g, target.length.toString())
                    ).toString());
            result = result.replace(/\([^()]+\)\*\d+/g, str => str.slice(1).split(')')[0]
                .repeat(Number(str.split(')*')[1]))
                );
            return result;
        });
    }

    return msg;
}

export async function createTTS(text: string, lang: string = 'auto', gender: Gender = 'female', alpha = 1, pitch = 1, speed = 1) {
    const timestamp = Date.now();
    const authorization = await getAutorization(URL_MAKE_ID, timestamp);

    if(languageCodes.every(codes => codes[0] !== lang)) lang = 'auto';
    if(lang == 'auto') lang = await detectLanguage(text);

    text = convertTTSMessage(text, lang);

    const params = new URLSearchParams({
        alpha: remap(clamp(alpha, 0, 2) / 2, 5, -5).toFixed(0),
        pitch: remap(clamp(pitch, 0, 2) / 2, 5, -5).toFixed(0),
        speed: remap(clamp(speed, 0, 2) / 2, 5, -5).toFixed(0),
        speaker: SPEACKER_MAP[`${lang.toLowerCase()}_${gender.toLowerCase()}`] ?? 
            SPEACKER_MAP['ko_' + gender.toLowerCase()],
        text
    });

    const data = (await axios.post(URL_MAKE_ID, params, { 
        headers: {
            'Authorization': authorization,
            'Timestamp': timestamp,
            'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
        },
        timeout: 5000
    }).catch(_ => ({ data: { id: 'err' } }))).data;
    return URL_TTS + data.id;
}