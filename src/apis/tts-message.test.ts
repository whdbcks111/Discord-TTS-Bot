import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldPlayTTSMessage, TTSMessageContext } from '../tts-message';

const baseContext: TTSMessageContext = {
    messageChannelId: 'text-channel',
    textChannelId: 'text-channel',
    privateChannelIds: [],
    memberVoiceChannelId: null,
    ttsVoiceChannelId: 'voice-channel',
    content: 'message'
};

test('plays a plus-prefixed message when the member is not in the voice channel', () => {
    assert.equal(shouldPlayTTSMessage({
        ...baseContext,
        content: '+message'
    }), true);
});

test('does not play a regular message when the member is not in the voice channel', () => {
    assert.equal(shouldPlayTTSMessage(baseContext), false);
});

test('plays a regular message when the member is in the TTS voice channel', () => {
    assert.equal(shouldPlayTTSMessage({
        ...baseContext,
        memberVoiceChannelId: 'voice-channel'
    }), true);
});

test('does not play messages outside recognized text channels', () => {
    assert.equal(shouldPlayTTSMessage({
        ...baseContext,
        messageChannelId: 'other-channel',
        content: '+message'
    }), false);
});

test('continues to ignore minus-prefixed messages', () => {
    assert.equal(shouldPlayTTSMessage({
        ...baseContext,
        memberVoiceChannelId: 'voice-channel',
        content: '-message'
    }), false);
});
