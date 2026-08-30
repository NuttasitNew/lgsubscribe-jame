import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/site";
import { cn } from "@/lib/utils";

export function FaqAccordion({ className }: { className?: string }) {
  return (
    <Accordion type="single" collapsible className={cn("rounded-2xl border bg-white px-6 sm:px-8", className)}>
      {faqs.map((faq, index) => (
        <AccordionItem key={faq.question} value={`question-${index}`}>
          <AccordionTrigger className="text-left text-base font-bold leading-7 hover:text-red-700 sm:text-lg">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-8 text-muted-foreground sm:text-base">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
