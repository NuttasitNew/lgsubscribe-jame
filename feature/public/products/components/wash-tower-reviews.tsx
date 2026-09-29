"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const initialPhotoCount = 8;

const reviewPhotos = [
  {
    src: "/images/reviews/wash-tower/customer-home-1.webp",
    alt: "ภาพรีวิว LG WashTower สีเขียวและขาวที่ติดตั้งในบ้านลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-2.webp",
    alt: "ลูกค้าดู LG WashTower ที่ติดตั้งในห้องซักผ้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-3.webp",
    alt: "ภาพรีวิว LG WashTower สีเขียวและขาวในพื้นที่ซักผ้าของบ้าน",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-4.webp",
    alt: "LG WashTower สีเขียวและขาวในมุมซักผ้าของบ้านลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-5.webp",
    alt: "LG WashTower ในมุมครัวของบ้านลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-6.webp",
    alt: "LG WashTower สองเครื่องในพื้นที่ใช้งานจริง",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-7.webp",
    alt: "LG WashTower วางข้างเครื่องซักผ้าในบ้านลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-8.webp",
    alt: "ภาพขนย้ายกล่อง LG WashTower เข้าบ้านลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-9.webp",
    alt: "ทีมงานติดตั้ง LG WashTower ในบ้านลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-10.webp",
    alt: "กล่อง LG WashTower ที่จัดส่งถึงหน้าบ้าน",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-11.webp",
    alt: "LG WashTower ขณะนำเข้าพื้นที่ติดตั้ง",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-12.webp",
    alt: "ทีมงานจัดวาง LG WashTower ในพื้นที่ซักผ้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-13.webp",
    alt: "LG WashTower วางคู่กับเครื่องกรองน้ำในบ้านลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/customer-home-14.webp",
    alt: "มุมด้านข้างของ LG WashTower ในห้องซักผ้า",
  },
];

export function WashTowerReviews() {
  const [showAll, setShowAll] = useState(false);
  const visiblePhotos = showAll ? reviewPhotos : reviewPhotos.slice(0, initialPhotoCount);

  return (
    <section className="section-space border-y border-black/10 bg-[#f4f1ed]" aria-labelledby="wash-tower-reviews-title">
      <div className="container-page">
        <div className="mb-8 sm:mb-10">
          <p className="eyebrow">รีวิวจากลูกค้า</p>
          <h2 id="wash-tower-reviews-title" className="mt-4 text-3xl font-bold leading-tight text-neutral-950 sm:text-4xl">
            WashTower
          </h2>
        </div>

        <div id="wash-tower-review-gallery" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {visiblePhotos.map((photo) => (
            <figure key={photo.src} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-black/10 bg-white">
              <Image src={photo.src} alt={photo.alt} fill loading="lazy" sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
            </figure>
          ))}
        </div>
        {!showAll ? (
          <div className="mt-8 text-center">
            <Button type="button" onClick={() => setShowAll(true)} aria-controls="wash-tower-review-gallery" aria-expanded={false} className="rounded-full bg-red-600 px-7 hover:bg-red-700">
              ดูรีวิวเพิ่มเติม
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
