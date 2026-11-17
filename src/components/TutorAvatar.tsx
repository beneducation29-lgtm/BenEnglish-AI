import React from 'react';
import speakingTutorPortrait from '../assets/images/speaking_tutor_portrait_1793851276329.jpg';

export type TutorAvatarState = 'idle' | 'thinking' | 'listening' | 'connected' | 'speaking' | 'connecting' | 'closed';

type Props = {
  name: string;
  state: TutorAvatarState;
  outputLevel?: number;
  inputLevel?: number;
};

const stateLabels: Record<TutorAvatarState, string> = {
  idle: 'Ready to talk',
  thinking: 'Thinking',
  listening: 'Listening to you',
  connected: 'Connected',
  speaking: 'Speaking',
  connecting: 'Connecting',
  closed: 'Offline',
};

export default function TutorAvatar({ name, state, outputLevel = 0, inputLevel = 0 }: Props) {
  const isSpeaking = state === 'speaking';
  const mouthOpen = isSpeaking ? Math.max(0.12, Math.min(1, outputLevel * 2.8 + 0.16)) : 0.08;
  const activity = state === 'listening' ? inputLevel : outputLevel;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2" aria-label={name + ': ' + stateLabels[state]}>
      <div className={'tutor-avatar-frame tutor-avatar-' + state} data-state={state}>
        <div className="tutor-avatar-image-wrap">
          <img src={speakingTutorPortrait} alt={name + ', AI English tutor'} className="tutor-avatar-image" />
        </div>
        <span className="tutor-avatar-eye tutor-avatar-eye-left" aria-hidden="true" />
        <span className="tutor-avatar-eye tutor-avatar-eye-right" aria-hidden="true" />
        <span
          className={'tutor-avatar-mouth ' + (isSpeaking ? 'tutor-avatar-mouth-speaking' : '')}
          style={{ transform: 'translateX(-50%) scaleY(' + mouthOpen + ')' }}
          aria-hidden="true"
        />
        <span className={'tutor-avatar-status-dot ' + (isSpeaking ? 'is-speaking' : state === 'listening' ? 'is-listening' : '')} />
        {activity > 0.08 && <span className="tutor-avatar-audio-glow" style={{ opacity: Math.min(0.65, activity) }} />}
      </div>
      <span className="max-w-[124px] truncate text-[10px] font-bold text-slate-300">{name}</span>
      <span className={'rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ' + (isSpeaking ? 'bg-teal-400/15 text-teal-200' : state === 'listening' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-slate-300')}>
        {stateLabels[state]}
      </span>
    </div>
  );
}
