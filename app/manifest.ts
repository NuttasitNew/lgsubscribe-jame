import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LG Subscribe Thailand",
    short_name: "LG Subscribe",
    description: "เครื่องใช้ไฟฟ้า LG แบบชำระรายเดือน พร้อมบริการดูแลตามแพ็กเกจ",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b91c1c",
    lang: "th",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
