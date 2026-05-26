import type { VisualizerAiAction } from './VisualizerAiActions';

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
  showAiRoomStudio?: boolean;
  aiRoomDisabled?: boolean;
  aiRoomBusy?: boolean;
  aiBusyAction?: VisualizerAiAction | null;
  canRearrange?: boolean;
  canCurate?: boolean;
  onRearrange?: () => void;
  onCurate?: () => void;
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
  showAiRoomStudio: false,
  aiRoomDisabled: true,
  aiRoomBusy: false,
  aiBusyAction: null,
  canRearrange: false,
  canCurate: false,
  onRearrange: () => {},
  onCurate: () => {},
};
