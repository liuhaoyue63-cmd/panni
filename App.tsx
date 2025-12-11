import React, { useState, useEffect } from 'react';
import ConductorStage from './components/ConductorStage';
import ControlPanel from './components/ControlPanel';
import { OrchestraState, InstrumentType } from './types';
import { audioEngine } from './services/audioEngine';
import { moodEngine } from './services/moodEngine';

const INITIAL_STATE: OrchestraState = {
  mood: 0,
  moodPhase: 'harmony',
  innovationStreak: 0,
  lastFingerprint: '',
  isPlaying: false,
  activeInstrument: 'piano'
};

const App: React.FC = () => {
  const [state, setState] = useState<OrchestraState>(INITIAL_STATE);
  const [isStarted, setIsStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await audioEngine.initialize();
      setState(prev => ({ ...prev, isPlaying: true }));
      setIsStarted(true);
    } catch (e) {
      console.error("Audio init failed", e);
      alert("请允许麦克风和摄像头权限以指挥乐团。");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    moodEngine.reset();
    setState(prev => ({ 
      ...prev, 
      mood: 0, 
      moodPhase: 'harmony',
      innovationStreak: 0 
    }));
    // Also reset audio effects immediately
    // Note: We need to access audio engine directly or via ref if we had exposed methods, 
    // but the engine checks mood on next trigger.
  };

  const handleInstrumentChange = (inst: InstrumentType) => {
    setState(prev => ({ ...prev, activeInstrument: inst }));
  };

  if (!isStarted) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 mb-6">
          叛逆乐团
        </h1>
        <p className="max-w-xl text-slate-300 mb-8 text-lg">
          你是指挥家，AI乐团是你的乐器。<br/><br/>
          <span className="text-cyan-400 font-bold">右手：</span> 控制音高（高度）和节奏（速度）。<br/>
          <span className="text-cyan-400 font-bold">左手：</span> 控制和声（和弦）。<br/><br/>
          <strong className="text-red-400">警告：</strong> 如果你重复单调，乐团会感到厌倦并开始叛逆。保持创新以掌控局面。
        </p>
        <button
          onClick={handleStart}
          disabled={loading}
          className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold text-xl shadow-[0_0_20px_#0891b2] transition-all transform hover:scale-105 disabled:opacity-50"
        >
          {loading ? '正在初始化...' : '拿起指挥棒'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      <ConductorStage 
        isPlaying={state.isPlaying}
        activeInstrument={state.activeInstrument}
        onStateUpdate={setState}
      />
      <ControlPanel 
        state={state}
        onReset={handleReset}
        onInstrumentChange={handleInstrumentChange}
      />
    </div>
  );
};

export default App;