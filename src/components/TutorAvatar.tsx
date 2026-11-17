import React from 'react';
import tutorPortrait from '../assets/images/speaking_tutor_portrait_1793851276329.jpg';

export type TutorAvatarState = 'idle' | 'thinking' | 'listening' | 'connected' | 'speaking' | 'connecting' | 'closed';

type TutorAvatarProps = {
  name: string;
  state: TutorAvatarState;
  inputLevel?: number;
  outputLevel?: number;
};

const statusText: Record<TutorAvatarState, string> = {
  idle: 'Ready to talk',
  thinking: 'Thinking',
  listening: 'Listening to you',
  connected: 'Connected',
  speaking: 'Speaking',
  connecting: 'Connecting',
  closed: 'Offline',
};

/**
 * Portrait presentation for the tutor. Facial motion is deliberately subtle:
 * blinking/head movement is idle animation; mouth/jaw movement is driven by
 * measured decoded tutor audio energy while Live mode is speaking.
 */
export default function TutorAvatar({
  name,
  state,
  inputLevel = 0,
  outputLevel = 0,
}: TutorAvatarProps) {
  const speaking = state === 'speaking';
  const listening = state === 'listening' || state === 'connected';
  const audioLevel = speaking ? outputLevel : listening ? inputLevel : 0;
  const mouthScale = speaking ? Math.max(0.16, Math.min(1.45, 0.2 + outputLevel * 3.4)) : 0.18;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2" aria-label={name + ': ' + statusText[state]}>
      <div className={'tutor-portrait-shell tutor-portrait-' + state} data-state={state}>
        <div className="tutor-portrait-photo-wrap">
          <img
            src={tutorPortrait}
            alt={name + ', AI English tutor'}
            className="tutor-portrait-photo"
            draggable={false}
          />
        </div>
        <span className="tutor-portrait-eye tutor-portrait-eye-left" aria-hidden="true" />
        <span className="tutor-portrait-eye tutor-portrait-eye-right" aria-hidden="true" />
        <span
          className={'tutor-portrait-mouth' + (speaking ? ' is-speaking' : '')}
          style={{ transform: 'translateX(-50%) scaleY(' + mouthScale + ')' }}
          aria-hidden="true"
        />
        {audioLevel > 0.035 && (
          <span
            className="tutor-portrait-audio-ring"
            style={{ opacity: Math.min(0.7, audioLevel) }}
            aria-hidden="true"
          />
        )}
        <span className="tutor-portrait-status-dot" aria-hidden="true" />
      </div>
      <span className="max-w-[150px] truncate text-[11px] font-bold text-slate-200">{name}</span>
      <span className={'rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ' +
        (speaking ? 'bg-teal-400/15 text-teal-200' :
          listening ? 'bg-emerald-400/15 text-emerald-200' :
          state === 'thinking' ? 'bg-amber-400/15 text-amber-200' : 'bg-white/10 text-slate-300')}>
        {statusText[state]}
      </span>
    </div>
  );
}
