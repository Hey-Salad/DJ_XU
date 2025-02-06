/**
 * @fileoverview Voice synthesis service using 11Labs API.
 */

/**
 * Configuration for voice synthesis.
 */
interface VoiceSynthesisConfig {
    /** Stability of the voice (0-1) */
    stability: number;
    /** How closely to match the reference voice (0-1) */
    similarity_boost: number;
    /** Voice style intensity (0-1) */
    style: number;
  }
  
  /**
   * Service for handling voice synthesis and playback.
   */
  export class ElevenLabsService {
    private readonly apiKey: string;
    private readonly agentConfig: {
      id: string;
      settings: VoiceSynthesisConfig;
    };
    private audioContext: AudioContext;
    private gainNode: GainNode;
  
    /**
     * Initializes the voice service.
     */
    constructor() {
      this.apiKey = import.meta.env.VITE_11LABS_API_KEY;
      this.agentConfig = {
        id: import.meta.env.VITE_11LABS_AGENT_ID,
        settings: {
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.60,
        },
      };
      
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
  
    /**
     * Synthesizes and plays voice audio.
     * 
     * @param {string} text - Text to synthesize
     * @param {number} musicVolume - Current music volume (0-1)
     * @throws {Error} If synthesis or playback fails
     */
    async speak(text: string, musicVolume: number = 1): Promise<void> {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_id: this.agentConfig.id,
            voice_settings: this.agentConfig.settings,
          }),
        });
  
        if (!response.ok) {
          throw new Error(`Voice synthesis failed: ${response.statusText}`);
        }
  
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Duck the music volume
        this.gainNode.gain.setValueAtTime(musicVolume * 0.3, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(
          musicVolume * 0.3,
          this.audioContext.currentTime + 0.5
        );
  
        // Play synthesized voice
        const audio = new Audio(audioUrl);
        await audio.play();
  
        // Restore music volume after voice finishes
        audio.onended = () => {
          this.gainNode.gain.linearRampToValueAtTime(
            musicVolume,
            this.audioContext.currentTime + 0.5
          );
        };
      } catch (error) {
        console.error('Voice synthesis error:', error);
        throw error;
      }
    }
  
    /**
     * Provides DJ commentary during track transitions.
     * 
     * @param {string} currentTrack - Current track info
     * @param {string} nextTrack - Next track info
     * @param {number} musicVolume - Current music volume
     */
    async provideTransitionCommentary(
      currentTrack: string,
      nextTrack: string,
      musicVolume: number = 1
    ): Promise<void> {
      const commentary = `Transitioning from ${currentTrack} into the mesmerizing sounds of ${nextTrack}. Feel the energy shift.`;
      await this.speak(commentary, musicVolume);
    }
  
    /**
     * Dispose of audio resources.
     */
    dispose(): void {
      this.gainNode.disconnect();
      this.audioContext.close();
    }
  }