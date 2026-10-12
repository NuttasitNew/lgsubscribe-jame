import { subscribeDayCampaign } from "./subscribe-day";

// Serve the original campaign JPEG without resizing, re-encoding, or stale variants.
export const subscribeDayImage = {
  src: subscribeDayCampaign.image,
};
