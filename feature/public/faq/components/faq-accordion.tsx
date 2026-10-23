import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/site";
import { cn } from "@/lib/utils";

type FaqItem = { question: string; answer: string };

// `items` defaults to the fixed FAQ list; the /faq page appends the AI-proposed entries published from the backoffice.
export function FaqAccordion({ className, items = faqs }: { className?: string; items?: readonly FaqItem[] }) {
  return (
    <Accordion type="single" collapsible className={cn("rounded-2xl border bg-white px-6 sm:px-8", className)}>
      {items.map((faq, index) => (
        <AccordionItem key={faq.question} value={`question-${index}`}>
          <AccordionTrigger className="text-left text-base font-bold leading-7 hover:text-red-700 sm:text-lg">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="whitespace-pre-line text-sm leading-8 text-muted-foreground sm:text-base">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
