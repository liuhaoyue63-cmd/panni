import React, { useRef, useEffect } from 'react';
import { audioEngine } from '../services/audioEngine';
import { moodEngine } from '../services/moodEngine';
import { OrchestraState, InstrumentType, HandResults } from '../types';
import { MOOD_THRESHOLDS } from '../constants';

// Declare globals loaded via script tags in index.html
declare const Hands: any;
declare const Camera: any;

interface ConductorStageProps {
  onStateUpdate: (updater: (prev: OrchestraState) => OrchestraState) => void;
  activeInstrument: InstrumentType;
  isPlaying: boolean;
}

const ConductorStage: React.FC<ConductorStageProps> = ({ onStateUpdate, activeInstrument, isPlaying }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Logic refs to avoid re-render loops
  const lastHandPos = useRef<{x: number, y: number} | null>(null);
  const lastTriggerTime = useRef<number>(0);
  const moodRef = useRef<number>(0);
  const innovationStreakRef = useRef<number>(0);

  // Visual effects state
  const ripples = useRef<{x: number, y: number, color: string, age: number}[]>([]);

  useEffect(() => {
    moodRef.current = 0; // Reset on mount
    
    if (!videoRef.current || !canvasRef.current) return;

    const hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    let camera: any = null;
    
    if (isPlaying) {
      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }

    return () => {
      if (camera) camera.stop();
      hands.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]); // Re-run when play state changes

  const onResults = (results: HandResults) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Clear and draw background
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    
    // Optionally draw video feed faintly
    ctx.globalAlpha = 0.1;
    ctx.drawImage(results.image, 0, 0, width, height);
    ctx.globalAlpha = 1.0;

    // Process Hands
    let rightHandIndex: number | null = null;
    let leftHandIndex: number | null = null;

    if (results.multiHandedness) {
      results.multiHandedness.forEach((label: any, index: number) => {
        if (label.label === 'Right') rightHandIndex = index;
        if (label.label === 'Left') leftHandIndex = index;
      });
    }

    // --- Audio Logic ---
    if (rightHandIndex !== null && results.multiHandLandmarks[rightHandIndex]) {
      const landmarks = results.multiHandLandmarks[rightHandIndex];
      const indexTip = landmarks[8]; // Index finger tip
      
      const currentPos = { x: indexTip.x, y: indexTip.y };
      const now = Date.now();

      // Check if we should trigger a note (movement + cooldown)
      if (lastHandPos.current && (now - lastTriggerTime.current > 150)) { // 150ms cooldown
        const dx = currentPos.x - lastHandPos.current.x;
        const dy = currentPos.y - lastHandPos.current.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Velocity threshold to trigger sound
        if (dist > 0.05) {
          // Check Left hand for chords
          let chordY: number | undefined;
          if (leftHandIndex !== null && results.multiHandLandmarks[leftHandIndex]) {
             chordY = results.multiHandLandmarks[leftHandIndex][8].y;
          }

          // Trigger Sound
          audioEngine.triggerNote(activeInstrument, currentPos.y, dist, moodRef.current, chordY);
          
          // Visual Ripple
          ripples.current.push({
            x: currentPos.x * width,
            y: currentPos.y * height,
            color: moodRef.current > 65 ? '#ef4444' : (moodRef.current > 30 ? '#facc15' : '#22d3ee'),
            age: 0
          });

          // Mood Analysis
          const { repetitionRate, isInnovative } = moodEngine.analyzeGesture(currentPos.y, dist, chordY);
          
          // Update Mood Logic
          let moodChange = repetitionRate * 15; // Penalty for repetition
          if (isInnovative) {
             moodChange = -25; // Bonus for innovation
             innovationStreakRef.current += 1;
             
             // Cadenza Reward
             if (innovationStreakRef.current >= 3) {
                audioEngine.playCadenza();
                innovationStreakRef.current = 0;
                moodChange = -40; // Mega bonus
             }
          } else {
             innovationStreakRef.current = 0;
          }

          let newMood = Math.max(0, Math.min(100, moodRef.current + moodChange));
          
          // Slow decay of mood if idle? No, only active conducting affects mood in this design.
          
          moodRef.current = newMood;
          lastTriggerTime.current = now;

          // Sync to React State for UI
          onStateUpdate(prev => ({
            ...prev,
            mood: newMood,
            moodPhase: newMood >= MOOD_THRESHOLDS.REBEL ? 'rebel' : (newMood >= MOOD_THRESHOLDS.HARMONY ? 'distracted' : 'harmony'),
            innovationStreak: innovationStreakRef.current
          }));
        }
      }
      lastHandPos.current = currentPos;
    } else {
      lastHandPos.current = null;
    }

    // --- Drawing Logic ---

    // Draw Ripples
    ripples.current.forEach((r, i) => {
      r.age += 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.age * 2, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4 - (r.age / 10);
      ctx.globalAlpha = 1 - (r.age / 40);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    ripples.current = ripples.current.filter(r => r.age < 40);

    // Draw Hands
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawHand(ctx, landmarks, width, height);
      }
    }

    ctx.restore();
  };

  const drawHand = (ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number) => {
     // Simple skeletal drawing
     const connections = [[0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8], [5,9],[9,10],[10,11],[11,12], [9,13],[13,14],[14,15],[15,16], [13,17],[17,18],[18,19],[19,20], [0,17]];
     
     ctx.strokeStyle = moodRef.current > 65 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 211, 238, 0.8)';
     ctx.lineWidth = 2;

     connections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
     });

     // Draw fingertips
     [4,8,12,16,20].forEach(idx => {
       const p = landmarks[idx];
       ctx.beginPath();
       ctx.arc(p.x * w, p.y * h, 6, 0, Math.PI * 2);
       ctx.fillStyle = '#fff';
       ctx.fill();
     });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas 
        ref={canvasRef} 
        width={1280} 
        height={720} 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default ConductorStage;