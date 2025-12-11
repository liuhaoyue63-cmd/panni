import React from 'react';
import { MOOD_DESCRIPTIONS, MOOD_THRESHOLDS } from '../constants';
import { OrchestraState, InstrumentType } from '../types';

interface ControlPanelProps {
  state: OrchestraState;
  onReset: () => void;
  onInstrumentChange: (inst: InstrumentType) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ state, onReset, onInstrumentChange }) => {
  const { mood, moodPhase, activeInstrument, innovationStreak } = state;
  
  const phaseInfo = MOOD_DESCRIPTIONS[moodPhase];
  
  // Progress bar color interpolation
  const getBarColor = () => {
    if (moodPhase === 'harmony') return 'bg-cyan-400';
    if (moodPhase === 'distracted') return 'bg-yellow-400';
    return 'bg-red-600';
  };

  const getInstrumentName = (inst: InstrumentType) => {
    switch(inst) {
      case 'piano': return '钢琴';
      case 'strings': return '弦乐';
      case 'synth': return '合成器';
      default: return inst;
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between z-10">
      
      {/* Top Bar: Stats & Controls */}
      <div className="flex justify-between items-start">
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 pointer-events-auto">
          <h1 className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
            叛逆乐团
          </h1>
          <div className="flex items-center gap-4 mb-2">
             <span className="text-sm text-slate-300">乐团情绪</span>
             <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ease-out ${getBarColor()}`} 
                  style={{ width: `${mood}%` }}
                />
             </div>
             <span className="font-mono text-xs">{Math.round(mood)}%</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-sm text-slate-300">状态：</span>
             <span className={`font-bold ${phaseInfo.color}`}>{phaseInfo.label}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 pointer-events-auto flex flex-col gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">音色选择</label>
            <div className="flex gap-2">
              {(['piano', 'strings', 'synth'] as InstrumentType[]).map(inst => (
                <button
                  key={inst}
                  onClick={() => onInstrumentChange(inst)}
                  className={`px-3 py-1 text-xs rounded border ${
                    activeInstrument === inst 
                      ? 'bg-cyan-900/50 border-cyan-400 text-cyan-300' 
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {getInstrumentName(inst)}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={onReset}
            className="w-full py-1 text-xs text-red-300 border border-red-900/50 hover:bg-red-900/20 rounded transition-colors"
          >
            重置情绪
          </button>
        </div>
      </div>

      {/* Center Indicator */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className={`text-9xl filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-transform duration-500 ${moodPhase === 'rebel' ? 'animate-pulse scale-110' : ''}`}>
          {phaseInfo.emoji}
        </div>
        {innovationStreak > 0 && (
          <div className="mt-4 animate-bounce">
            <span className="bg-gradient-to-r from-yellow-300 to-amber-500 text-slate-900 font-bold px-4 py-2 rounded-full shadow-[0_0_15px_#f59e0b]">
              创新连击： {innovationStreak}/3
            </span>
          </div>
        )}
      </div>

      {/* Bottom Status */}
      <div className="flex justify-center">
        <div className="bg-slate-900/60 backdrop-blur border border-white/10 px-6 py-3 rounded-full text-center max-w-lg">
          <p className="text-slate-200 text-sm md:text-base font-light">
            {phaseInfo.desc}
          </p>
          <div className="mt-2 text-xs text-slate-400 flex gap-4 justify-center">
             <span>右手高度：音高</span>
             <span>右手速度：时值</span>
             <span>左手高度：和弦</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ControlPanel;