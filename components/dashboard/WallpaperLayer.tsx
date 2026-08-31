interface WallpaperLayerProps {
  src: string | null;
  onLoad?: () => void;
  onLoadError?: () => void;
}

export function WallpaperLayer({
  src,
  onLoad,
  onLoadError,
}: WallpaperLayerProps) {
  if (!src) {
    return null;
  }

  return (
    <img
      aria-hidden="true"
      alt=""
      className="pointer-events-none fixed inset-0 z-0 size-full object-cover object-center"
      draggable={false}
      referrerPolicy="no-referrer"
      src={src}
      onError={onLoadError}
      onLoad={onLoad}
    />
  );
}
