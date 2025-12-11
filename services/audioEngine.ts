import * as Tone from 'tone';
import { C_MAJOR_SCALE, WHOLE_TONE_SCALE, MOOD_THRESHOLDS } from '../constants';
import { InstrumentType, ChordType } from '../types';

class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private stringSynth: Tone.PolySynth | null = null;
  private pianoSynth: Tone.Sampler | Tone.PolySynth | null = null;
  
  private distortion: Tone.Distortion | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private mainOutput: Tone.Gain | null = null;

  private isInitialized = false;

  public async initialize() {
    if (this.isInitialized) return;
    await Tone.start();

    // Create Effects
    this.distortion = new Tone.Distortion(0).toDestination();
    this.reverb = new Tone.Reverb(3).toDestination();
    this.delay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
    this.mainOutput = new Tone.Gain(0.8).toDestination();

    // Connect effects chain
    // Synth -> Distortion -> Delay -> Reverb -> Output
    this.mainOutput.connect(this.distortion);
    this.distortion.connect(this.delay);
    this.delay.connect(this.reverb);

    // Initialize Synths
    // 1. Synth (Square)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
    }).connect(this.mainOutput);

    // 2. Strings (Sawtooth with slow attack)
    this.stringSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fmsawtooth", modulationType: "sine" },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 2 }
    }).connect(this.mainOutput);

    // 3. Piano (Triangle approximation)
    this.pianoSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.2, release: 0.8 }
    }).connect(this.mainOutput);

    this.reverb.wet.value = 0.2;
    this.delay.wet.value = 0;
    this.distortion.distortion = 0;

    this.isInitialized = true;
  }

  // Get active synth based on selection
  private getSynth(type: InstrumentType) {
    switch (type) {
      case 'strings': return this.stringSynth;
      case 'piano': return this.pianoSynth;
      case 'synth': default: return this.synth;
    }
  }

  // Map 0-1 input to a note in the scale
  private getNoteFromHeight(y: number, mood: number): string {
    const isRebel = mood >= MOOD_THRESHOLDS.REBEL;
    const scale = isRebel ? WHOLE_TONE_SCALE : C_MAJOR_SCALE;
    
    // Invert y (0 is top, 1 is bottom) -> 0 should be high note, 1 low note
    // Actually typically screen y: 0 is top. We want top = High Pitch.
    // So Input 0 -> Index Max. Input 1 -> Index 0.
    const index = Math.floor((1 - y) * (scale.length - 1));
    const safeIndex = Math.max(0, Math.min(index, scale.length - 1));
    
    let note = scale[safeIndex];

    // Distracted Phase: Random pitch offset
    if (mood >= MOOD_THRESHOLDS.HARMONY && mood < MOOD_THRESHOLDS.REBEL) {
      if (Math.random() < 0.3) {
         // This is a simple simulation of "wrong note" by just grabbing a neighbor
         const offset = Math.random() > 0.5 ? 1 : -1;
         const newIndex = Math.max(0, Math.min(scale.length - 1, safeIndex + offset));
         note = scale[newIndex];
      }
    }

    return note;
  }

  public triggerNote(
    instrument: InstrumentType, 
    yPos: number, 
    velocity: number, 
    mood: number,
    chordHeight?: number // For left hand
  ) {
    if (!this.isInitialized) return;

    const synth = this.getSynth(instrument);
    if (!synth) return;

    // 1. Determine Note
    const rootNote = this.getNoteFromHeight(yPos, mood);
    
    // 2. Determine Duration based on velocity (faster = shorter)
    let duration = "4n";
    if (velocity > 0.05) duration = "8n";
    if (velocity > 0.1) duration = "16n";
    if (velocity < 0.01) duration = "2n";

    // Rebel Phase: Mess with rhythm
    if (mood >= MOOD_THRESHOLDS.REBEL && Math.random() < 0.4) {
      duration = Math.random() > 0.5 ? "32t" : "1m"; // Extreme fast or slow
    }

    // 3. Determine Chord if left hand is present
    let notesToPlay = [rootNote];
    if (chordHeight !== undefined) {
      // Rebel Mode: 20% chance to ignore chords or 30% chance to play wrong chord
      const ignoreChord = mood >= MOOD_THRESHOLDS.HARMONY && Math.random() < 0.2;
      
      if (!ignoreChord) {
        // Map chordHeight (0 top - 1 bottom)
        // High (top) = Dom7, Mid = Minor, Low (bottom) = Major
        let chordType = ChordType.MAJOR;
        if (chordHeight < 0.33) chordType = ChordType.DOMINANT7;
        else if (chordHeight < 0.66) chordType = ChordType.MINOR;

        notesToPlay = this.getChordNotes(rootNote, chordType);
      }
    }

    // 4. Apply Mood Effects
    this.applyMoodEffects(mood);

    // 5. Trigger
    const now = Tone.now();
    let time = now;

    // Distracted/Rebel Delay
    if (mood >= MOOD_THRESHOLDS.HARMONY) {
       const delayAmount = mood >= MOOD_THRESHOLDS.REBEL ? Math.random() * 0.5 : Math.random() * 0.1;
       time += delayAmount;
    }

    // Rebel: Random pause
    if (mood >= MOOD_THRESHOLDS.REBEL && Math.random() < 0.1) {
       // Skip playing
       return;
    }

    try {
      synth.triggerAttackRelease(notesToPlay, duration, time);
    } catch (e) {
      console.warn("Synth trigger error", e);
    }

    return { notes: notesToPlay, duration, time };
  }

  private getChordNotes(root: string, type: ChordType): string[] {
    // Simple chord construction using Tone's frequency logic or interval mapping
    // We'll parse the note string (e.g., "C4")
    const rootFreq = Tone.Frequency(root);
    
    switch (type) {
      case ChordType.MAJOR:
        return [root, rootFreq.transpose(4).toNote(), rootFreq.transpose(7).toNote()];
      case ChordType.MINOR:
        return [root, rootFreq.transpose(3).toNote(), rootFreq.transpose(7).toNote()];
      case ChordType.DOMINANT7:
        return [root, rootFreq.transpose(4).toNote(), rootFreq.transpose(7).toNote(), rootFreq.transpose(10).toNote()];
      default:
        return [root];
    }
  }

  private applyMoodEffects(mood: number) {
    if (!this.distortion || !this.reverb || !this.delay) return;

    if (mood < MOOD_THRESHOLDS.HARMONY) {
      this.distortion.distortion = 0;
      this.reverb.wet.rampTo(0.2, 0.1);
      this.delay.wet.rampTo(0, 0.1);
    } else if (mood < MOOD_THRESHOLDS.REBEL) {
      // Distracted
      this.distortion.distortion = 0.2;
      this.reverb.wet.rampTo(0.4, 0.1);
      this.delay.wet.rampTo(0.3, 0.1);
    } else {
      // Rebel
      this.distortion.distortion = 0.8; // Heavy distortion
      this.reverb.wet.rampTo(0.8, 0.1); // Washy
      this.delay.wet.rampTo(0.6, 0.1); // Echoey
    }
  }

  public playCadenza() {
    if (!this.isInitialized) return;
    const now = Tone.now();
    const arp = ["C3", "E3", "G3", "B3", "C4", "E4", "G4", "C5"];
    
    // Play a harmonious arpeggio to reward innovation
    this.pianoSynth?.triggerAttackRelease("C2", "2m", now);
    
    arp.forEach((note, i) => {
      this.stringSynth?.triggerAttackRelease(note, "8n", now + i * 0.1);
      this.synth?.triggerAttackRelease(note, "16n", now + i * 0.1 + 0.05);
    });
  }

  public stopAll() {
    this.synth?.releaseAll();
    this.stringSynth?.releaseAll();
    this.pianoSynth?.releaseAll();
  }
}

export const audioEngine = new AudioEngine();
