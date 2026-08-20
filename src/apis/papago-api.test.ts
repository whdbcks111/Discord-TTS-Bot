import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import axios from 'axios';
import { createTTS, detectLanguage } from './papago-api';

const originalPost = axios.post;

afterEach(() => {
    axios.post = originalPost;
});

test('createTTS uses the current Papago endpoint and returns an audio URL', async () => {
    let requestUrl = '';
    let requestBody: URLSearchParams | undefined;

    axios.post = (async (url: string, body: URLSearchParams) => {
        requestUrl = url;
        requestBody = body;
        return { data: { id: 'voice/id' } };
    }) as typeof axios.post;

    const result = await createTTS('안녕하세요', 'ko', 'female');

    assert.equal(requestUrl, 'https://papago.naver.com/api/tts/makeID');
    assert.equal(requestBody?.get('speaker'), 'kyuri');
    assert.equal(requestBody?.get('text'), '안녕하세요');
    assert.equal(requestBody?.get('pitch'), '0');
    assert.equal(requestBody?.get('speed'), '0');
    assert.equal(result, 'https://papago.naver.com/api/tts/voice%2Fid');
});

test('createTTS rejects invalid responses instead of returning a broken URL', async () => {
    axios.post = (async () => ({ data: {} })) as typeof axios.post;

    await assert.rejects(
        createTTS('안녕하세요', 'ko'),
        /Papago TTS 요청 실패: 응답에 음성 ID가 없습니다/
    );
});

test('detectLanguage falls back to English when the API is unavailable', async () => {
    axios.post = (async () => {
        throw new Error('network unavailable');
    }) as typeof axios.post;

    assert.equal(await detectLanguage('hello world'), 'en');
    assert.equal(await detectLanguage('안녕하세요'), 'ko');
});
