export type InstrumentType = 'piano' | 'strings' | 'synth';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  multiHandLandmarks: HandLandmark[][];
  multiHandedness: { label: string; score: number }[];
  image: CanvasImageSource;
}

export interface OrchestraState {
  mood: number; // 0-100
  moodPhase: 'harmony' | 'distracted' | 'rebel';
  innovationStreak: number;
  lastFingerprint: string;
  isPlaying: boolean;
  activeInstrument: InstrumentType;
}

export interface MoodConfig {
  repetitionPenalty: number; // How much mood increases per repetition
  innovationBonus: number; // How much mood decreases for innovation
}

export enum ChordType {
  MAJOR = 'major',
  MINOR = 'minor',
  DOMINANT7 = 'dom7'
}