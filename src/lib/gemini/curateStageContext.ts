import type { RoomCurateBrief } from './roomCurateBrief';

/** Brief from product selection, consumed once by the next curate image call. */
let pendingBrief: RoomCurateBrief | undefined;

export function setCurateBriefForNextStage(brief: RoomCurateBrief): void {
  pendingBrief = brief;
}

export function consumeCurateBrief(): RoomCurateBrief | undefined {
  const brief = pendingBrief;
  pendingBrief = undefined;
  return brief;
}
