export { metadata, default } from "@/feature/public/faq/components/faq-page";

// Published AI FAQ entries come from the database; publishing revalidates /faq/ immediately.
export const revalidate = 3600;
