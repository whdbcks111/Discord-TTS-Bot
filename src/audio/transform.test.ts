import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAudioFilter, isValidAudioMultiplier } from './transform';

test('audio multipliers accept any positive finite value', () => {
    assert.equal(isValidAudioMultiplier(0.01), true);
    assert.equal(isValidAudioMultiplier(1000), true);
    assert.equal(isValidAudioMultiplier(0), false);
    assert.equal(isValidAudioMultiplier(-1), false);
    assert.equal(isValidAudioMultiplier(Infinity), false);
});

test('normal pitch and speed do not alter audio', () => {
    assert.equal(buildAudioFilter(1, 1), 'anull');
});

test('large pitch and speed values are split into valid FFmpeg stages', () => {
    const filter = buildAudioFilter(4, 40_000);

    assert.match(filter, /asetrate=96000/);
    assert.match(filter, /aresample=48000/);
    assert.match(filter, /atempo=/);

    const tempoValues = Array.from(
        filter.matchAll(/atempo=([0-9.]+)/g),
        match => Number(match[1])
    );
    for(const value of tempoValues) {
        assert.ok(value >= 0.5 && value <= 100);
    }
    assert.equal(tempoValues.reduce((result, value) => result * value, 1), 10_000);
});

test('non-positive multipliers are rejected', () => {
    assert.throws(() => buildAudioFilter(0, 1), RangeError);
    assert.throws(() => buildAudioFilter(1, -1), RangeError);
});
