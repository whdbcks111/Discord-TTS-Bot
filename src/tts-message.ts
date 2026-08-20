export type TTSMessageContext = {
    messageChannelId: string,
    textChannelId: string | null,
    privateChannelIds: string[],
    memberVoiceChannelId: string | null,
    ttsVoiceChannelId: string | null,
    content: string
};

export function shouldPlayTTSMessage(context: TTSMessageContext) {
    const isRecognizedChannel = context.messageChannelId === context.textChannelId ||
        context.privateChannelIds.includes(context.messageChannelId);
    const isMemberInTTSVoiceChannel = context.memberVoiceChannelId === context.ttsVoiceChannelId;
    const isForcedMessage = context.content.startsWith('+');

    return isRecognizedChannel &&
        !context.content.startsWith('-') &&
        (isMemberInTTSVoiceChannel || isForcedMessage);
}
