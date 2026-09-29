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

// The customer photo matches the navy/beige finish. The delivery photos show
// WashTower cartons without a visible machine; none is assigned to an exact model.
const navyBeigeModels = new Set(["WT1410NHEN", "WT2520NHEN"]);
const navyBeigePhotos: ReviewPhoto[] = [
  {
    src: "/images/reviews/wash-tower/navy-beige-customer-home.webp",
    alt: "LG WashTower สีกรมท่าและเบจสองเครื่องในพื้นที่ใช้งานของลูกค้า",
  },
  {
    src: "/images/reviews/wash-tower/wash-tower-delivery-396.webp",
    alt: "ทีมงานขนย้ายกล่อง LG WashTower เข้าพื้นที่จัดส่ง",
  },
  {
    src: "/images/reviews/wash-tower/wash-tower-delivery-401.webp",
    alt: "ทีมงานนำกล่อง LG WashTower ลงจากรถขนส่ง",
  },
];

export function WashTowerReviews({ model }: { model: string }) {
  const verifiedPhotos = reviewPhotosByModel[model];
  const colorMatched = !verifiedPhotos && navyBeigeModels.has(model);
  const photos = verifiedPhotos ?? (colorMatched ? navyBeigePhotos : undefined);
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

        <div
          id="wash-tower-review-gallery"
          className={
            colorMatched
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5"
              : "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
          }
        >
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
                sizes={colorMatched ? "(max-width: 640px) 50vw, 33vw" : "(max-width: 1024px) 50vw, 25vw"}
                className="object-cover"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
