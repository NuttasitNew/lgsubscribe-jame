import { subscribeDayCampaign } from "./subscribe-day";

// Serve the original campaign artwork without resizing, re-encoding, or stale variants.
export const subscribeDayImage = {
  src: subscribeDayCampaign.image,
  width: subscribeDayCampaign.imageWidth,
  height: subscribeDayCampaign.imageHeight,
};
