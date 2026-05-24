export type ShareFeedback = 'idle' | 'copied' | 'shared';

export interface VisualizerChromeState {
  canShare: boolean;
  shareFeedback: ShareFeedback;
  onShare: () => void;
  showCompare: boolean;
  isComparing: boolean;
  onToggleCompare: () => void;
  showChangePhoto: boolean;
  onChangeRoomPhoto: () => void;
}

export const defaultVisualizerChrome: VisualizerChromeState = {
  canShare: false,
  shareFeedback: 'idle',
  onShare: () => {},
  showCompare: false,
  isComparing: false,
  onToggleCompare: () => {},
  showChangePhoto: false,
  onChangeRoomPhoto: () => {},
};
