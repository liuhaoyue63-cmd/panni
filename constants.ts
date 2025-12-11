export const MOOD_THRESHOLDS = {
  HARMONY: 30,
  REBEL: 65,
};

export const C_MAJOR_SCALE = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

// For Rebel mode
export const WHOLE_TONE_SCALE = ['C3', 'D3', 'E3', 'F#3', 'G#3', 'A#3', 'C4', 'D4', 'E4', 'F#4', 'G#4', 'A#4', 'C5'];

export const MOOD_DESCRIPTIONS = {
  harmony: {
    label: '全心投入',
    color: 'text-cyan-400',
    emoji: '😊',
    desc: '乐团正在精准执行你的指令。'
  },
  distracted: {
    label: '略有分心',
    color: 'text-yellow-400',
    emoji: '😐',
    desc: '乐团开始感到厌倦，偶尔会走神。'
  },
  rebel: {
    label: '公然叛逆',
    color: 'text-red-500',
    emoji: '😠',
    desc: '乐团拒绝配合！准备迎接混乱！'
  }
};