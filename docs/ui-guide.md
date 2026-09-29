# Public UI reference

Use this page as the small index for the public site. The implementation remains the source of truth.

- Stack and tokens: `app/globals.css` defines colors, type, `container-page`, `section-space`, `eyebrow`, and `page-hero`. Check the relevant Next.js guide in `node_modules/next/dist/docs/` before editing framework behavior.
- Public shell: `app/(public)/layout.tsx` composes `components/site-header.tsx`, `components/site-footer.tsx`, `components/floating-line-contact.tsx`, and `components/mobile-dock.tsx`.
- Primitives: `components/ui/button.tsx` for actions, `components/ui/badge.tsx` for labels, `components/ui/card.tsx` for framed content. Example: `feature/public/products/components/product-detail-page.tsx`.
- Product details: `feature/public/products/components/product-detail-page.tsx` owns the section order; `product-gallery.tsx` handles product image navigation; `product-specifications.tsx` displays verified specifications. Route: `/products/[slug]/`.
- WashTower reviews: `feature/public/products/components/wash-tower-reviews.tsx` displays eight review photos first and reveals six more on request at `/products/lg-washtower-wt1410nheg/`. Images load lazily. Do not present photographs as written customer testimonials.
- Representative public pages: `feature/public/home/components/home-page.tsx` shows the homepage review and product cards; `feature/public/what-is-lg-subscribe/components/what-is-lg-subscribe-page.tsx` shows guide sections. These references were source-inspected for this guide.

Keep section content within `container-page`, use existing responsive spacing and red calls to action, and check desktop and mobile after visual changes. The public marketing site has its own warm neutral and red palette; backoffice defaults do not apply here.
