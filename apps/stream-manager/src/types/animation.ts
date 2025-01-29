import { Point2D, Transform } from './layers';

export type EasingFunction = 
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'spring';

export type AnimatableProperty = 
  | 'opacity'
  | 'position'
  | 'scale'
  | 'rotation'
  | 'transform';

export type AnimationValue = number | Point2D | Transform;

export interface Animation {
  id: string;
  targetLayerId: string;
  property: AnimatableProperty;
  startValue: AnimationValue;
  endValue: AnimationValue;
  duration: number;
  easing: EasingFunction;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
}

export interface Timeline {
  id: string;
  animations: Animation[];
  duration: number;
  loop?: boolean;
  currentTime?: number;
  paused?: boolean;
}

export interface KeyframeAnimation extends Omit<Animation, 'startValue' | 'endValue'> {
  keyframes: Array<{
    time: number;
    value: AnimationValue;
  }>;
}

export interface SpringAnimation extends Omit<Animation, 'duration' | 'easing'> {
  stiffness: number;
  damping: number;
  mass: number;
  velocity: number;
}

export type AnimationState = {
  activeAnimations: Animation[];
  activeTimelines: Timeline[];
  pausedAnimations: Animation[];
  pausedTimelines: Timeline[];
}; 