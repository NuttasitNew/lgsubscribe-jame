import image from "./subscribe-day-image.json";

// Versioned, pre-compressed images avoid a cold image-optimizer request for the popup.
export const subscribeDayImage = {
  src: image.images[1].src,
  srcSet: image.images.map(({ src, width }) => `${src} ${width}w`).join(", "),
  sizes: "(min-width: 640px) 512px, calc(100vw - 24px)",
};
