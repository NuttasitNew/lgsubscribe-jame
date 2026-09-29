import Image from "next/image";

type ReviewPhoto = { src: string; alt: string };

// The WT1410NHEG code is readable on the carton in 3163901_0.jpg.
// Photos 3163901–3163904 show the same delivery and installation.
// The other albums have no readable model code, so color alone cannot assign them.
const reviewPhotosByModel: Record<string, ReviewPhoto[]> = {
  WT1410NHEG: [
    {
      src: "/images/reviews/wash-tower/wt1410nheg-3.webp",
      alt: "LG WashTower WT1410NHEG ก่อนติดตั้งในบ้านลูกค้า",
    },
    {
      src: "/images/reviews/wash-tower/wt1410nheg-4.webp",
      alt: "ทีมงานติดตั้ง LG WashTower WT1410NHEG ในพื้นที่ซักผ้า",
    },
    {
      src: "/images/reviews/wash-tower/wt1410nheg-1.webp",
      alt: "กล่อง LG WashTower WT1410NHEG ที่จัดส่งถึงบ้านลูกค้า",
    },
    {
      src: "/images/reviews/wash-tower/wt1410nheg-2.webp",
      alt: "กล่อง LG WashTower WT1410NHEG ขณะขนย้ายเข้าบ้าน",
    },
  ],
};

export function WashTowerReviews({ model }: { model: string }) {
  const photos = reviewPhotosByModel[model];
  if (!photos?.length) return null;

  return (
    <section
      className="section-space border-y border-black/10 bg-[#f4f1ed]"
      aria-labelledby="wash-tower-reviews-title"
    >
      <div className="container-page">
        <div className="mb-8 sm:mb-10">
          <p className="eyebrow">รีวิวจากลูกค้า</p>
          <h2
            id="wash-tower-reviews-title"
            className="mt-4 text-3xl font-bold leading-tight text-neutral-950 sm:text-4xl"
          >
            WashTower
          </h2>
        </div>

        <div id="wash-tower-review-gallery" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {photos.map((photo) => (
            <figure
              key={photo.src}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-black/10 bg-white"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
