/** Visible rectangle of an image rendered with object-fit: cover inside a container */
export interface CoverRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Visible rectangle of an image rendered with object-fit: contain inside a container */
export function getObjectContainRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): CoverRect {
  if (!containerW || !containerH || !imageW || !imageH) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }

  const containerRatio = containerW / containerH;
  const imageRatio = imageW / imageH;

  let width: number;
  let height: number;

  if (imageRatio > containerRatio) {
    width = containerW;
    height = width / imageRatio;
  } else {
    height = containerH;
    width = height * imageRatio;
  }

  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

export function getObjectCoverRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): CoverRect {
  if (!containerW || !containerH || !imageW || !imageH) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }

  const containerRatio = containerW / containerH;
  const imageRatio = imageW / imageH;

  let width: number;
  let height: number;

  if (imageRatio > containerRatio) {
    height = containerH;
    width = height * imageRatio;
  } else {
    width = containerW;
    height = width / imageRatio;
  }

  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

/** Normalized anchor (0–1 on intrinsic image) → pixel position inside container */
export function anchorToContainerPosition(
  anchorX: number,
  anchorY: number,
  cover: CoverRect
): { left: number; top: number } {
  return {
    left: cover.left + anchorX * cover.width,
    top: cover.top + anchorY * cover.height,
  };
}
