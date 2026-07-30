import axios from 'axios';
import { readFileSync } from 'fs';
import path from 'path';
import { calculate } from './calculator';

const PAPAGO_ORIGIN = 'https://papago.naver.com';
const URL_MAKE_ID = `${PAPAGO_ORIGIN}/api/tts/makeID`;
const URL_TTS = `${PAPAGO_ORIGIN}/api/tts/`;
const URL_DETECT_LANG = `${PAPAGO_ORIGIN}/api/langs/dect`;
const REQUEST_TIMEOUT = 10_000;
const MAX_TTS_TEXT_LENGTH = 5_000;
const FORM_HEADERS = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
};

const SPEAKER_MAP: { [key: string]: string } = {
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

function getErrorDescription(error: unknown) {
    if(axios.isAxiosError(error)) {
        const status = error.response?.status;
        const responseData = error.response?.data;
        const detail = typeof responseData === 'string'
            ? responseData.slice(0, 200)
            : JSON.stringify(responseData)?.slice(0, 200);

        return [status && `HTTP ${status}`, detail, error.message]
            .filter(Boolean)
            .join(' - ');
    }

    return error instanceof Error ? error.message : String(error);
}

export async function detectLanguage(query: string) {
    let data: { langCode?: unknown } = {};

    try {
        const response = await axios.post(
            URL_DETECT_LANG,
            new URLSearchParams({ query }),
            {
                headers: FORM_HEADERS,
                timeout: REQUEST_TIMEOUT
            }
        );
        data = response.data;
    }
    catch {
        // The lightweight local fallback below keeps TTS usable if detection fails.
    }

    let langCode = String(data.langCode);
    if(!languageCodes.some(code => code[0] === langCode)) {
        langCode = (query.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g)?.length ?? 0) >=
            (query.match(/[a-zA-Z]/g)?.length ?? 0) ? 'ko' : 'en';
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
    if(languageCodes.every(codes => codes[0] !== lang)) lang = 'auto';
    if(lang == 'auto') lang = await detectLanguage(text);

    text = convertTTSMessage(text, lang).slice(0, MAX_TTS_TEXT_LENGTH);

    const params = new URLSearchParams({
        alpha: remap(clamp(alpha, 0, 2) / 2, 5, -5).toFixed(0),
        pitch: remap(clamp(pitch, 0, 2) / 2, 5, -5).toFixed(0),
        speed: remap(clamp(speed, 0, 2) / 2, 5, -5).toFixed(0),
        speaker: SPEAKER_MAP[`${lang.toLowerCase()}_${gender.toLowerCase()}`] ??
            SPEAKER_MAP['ko_' + gender.toLowerCase()],
        text
    });

    try {
        const response = await axios.post<{ id?: unknown }>(URL_MAKE_ID, params, {
            headers: FORM_HEADERS,
            timeout: REQUEST_TIMEOUT
        });
        const id = response.data?.id;

        if(typeof id !== 'string' || id.length === 0) {
            throw new Error('응답에 음성 ID가 없습니다.');
        }

        return URL_TTS + encodeURIComponent(id);
    }
    catch(error) {
        throw new Error(`Papago TTS 요청 실패: ${getErrorDescription(error)}`);
    }
}
