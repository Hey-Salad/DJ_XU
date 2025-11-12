/**
 * @fileoverview Application text translations for multiple languages.
 */

export const translations = {
  en: {
    title: 'AI-Powered Music Experience',
    subtitle: 'Connect your music platform & talk with our AI DJ',
    connectSpotify: 'Connect Spotify',
    nowPlaying: 'Now Playing',
    connecting: 'Connecting to Spotify...',
    microphoneError: 'Error with voice input. Please try again.',
    voiceProcessingError: 'Failed to process voice command. Please try again.',
    browserNotSupported: 'Speech recognition is not supported in your browser.',
    microphoneAccessError: 'Unable to access microphone. Please check permissions.',
    clickToConnect: 'Click the logo to connect with Spotify',
  },
  cn: {
    title: 'AI驱动的音乐体验',
    subtitle: '连接您的音乐平台并与我们的AI DJ交谈',
    connectSpotify: '连接 Spotify',
    nowPlaying: '正在播放',
    connecting: '正在连接 Spotify...',
    microphoneError: '语音输入错误。请重试。',
    voiceProcessingError: '无法处理语音命令。请重试。',
    browserNotSupported: '您的浏览器不支持语音识别。',
    microphoneAccessError: '无法访问麦克风。请检查权限。',
    clickToConnect: '点击标志连接 Spotify',
  },
} as const;

export type SupportedLanguage = keyof typeof translations;
