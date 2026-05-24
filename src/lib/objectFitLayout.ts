/** Visible rectangle of an image rendered with object-fit: cover */
export interface ObjectFitLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Maps container + intrinsic image size to the cropped "cover" region.
 * Hotspot x/y (0–100) should be relative to this region, not the viewport.
 */
export function getObjectCoverLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ObjectFitLayout {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }

  const containerRatio = containerWidth / containerHeight;
  const imageRatio = imageWidth / imageHeight;

  let width: number;
  let height: number;

  if (imageRatio > containerRatio) {
    height = containerHeight;
    width = height * imageRatio;
  } else {
    width = containerWidth;
    height = width / imageRatio;
  }

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

/** Click position → image-normalized percent (for hotspot authoring). */
export function clientToImagePercent(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  layout: ObjectFitLayout
): { x: number; y: number } | null {
  const localX = clientX - containerRect.left - layout.left;
  const localY = clientY - containerRect.top - layout.top;

  if (
    localX < 0 ||
    localY < 0 ||
    localX > layout.width ||
    localY > layout.height
  ) {
    return null;
  }

  return {
    x: (localX / layout.width) * 100,
    y: (localY / layout.height) * 100,
  };
}
