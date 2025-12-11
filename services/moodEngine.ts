import { InstrumentType, ChordType } from '../types';

interface GestureFingerprint {
  pitchBucket: number; // 0-10 scale
  velocityBucket: string; // 'slow', 'med', 'fast'
  chordType: ChordType | 'none';
  timestamp: number;
}

export class MoodEngine {
  private history: GestureFingerprint[] = [];
  private readonly HISTORY_SIZE = 10;
  
  // Track consecutive new gestures for innovation streak
  private lastSimilarityScore = 0; 

  public analyzeGesture(
    pitchY: number, 
    velocity: number, 
    chordY: number | undefined
  ): { repetitionRate: number; isInnovative: boolean } {
    
    const fingerprint = this.createFingerprint(pitchY, velocity, chordY);
    
    // Add to history
    this.history.push(fingerprint);
    if (this.history.length > this.HISTORY_SIZE) {
      this.history.shift();
    }

    // Calculate Repetition Rate (0 to 1)
    const repetitionRate = this.calculateRepetition(fingerprint);
    
    // Detect Innovation
    // If repetition is very low (< 0.2) and previous repetition was also low
    const isInnovative = repetitionRate < 0.2;

    return { repetitionRate, isInnovative };
  }

  public reset() {
    this.history = [];
  }

  private createFingerprint(y: number, v: number, cy: number | undefined): GestureFingerprint {
    // Quantize pitch to ~10 buckets
    const pitchBucket = Math.floor((1 - y) * 10);
    
    let velocityBucket = 'med';
    if (v < 0.02) velocityBucket = 'slow';
    if (v > 0.1) velocityBucket = 'fast';

    let chordType: ChordType | 'none' = 'none';
    if (cy !== undefined) {
      if (cy < 0.33) chordType = ChordType.DOMINANT7;
      else if (cy < 0.66) chordType = ChordType.MINOR;
      else chordType = ChordType.MAJOR;
    }

    return {
      pitchBucket,
      velocityBucket,
      chordType,
      timestamp: Date.now()
    };
  }

  private calculateRepetition(current: GestureFingerprint): number {
    if (this.history.length < 2) return 0;

    let matches = 0;
    // Compare current against history (excluding self)
    for (let i = 0; i < this.history.length - 1; i++) {
      const item = this.history[i];
      
      const pitchMatch = Math.abs(item.pitchBucket - current.pitchBucket) <= 1;
      const speedMatch = item.velocityBucket === current.velocityBucket;
      const chordMatch = item.chordType === current.chordType;

      if (pitchMatch && speedMatch && chordMatch) {
        matches++;
      }
    }

    return matches / (this.history.length - 1);
  }
}

export const moodEngine = new MoodEngine();
