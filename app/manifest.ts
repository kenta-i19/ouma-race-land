import type { MetadataRoute } from "next";

// ホームがめんに ついかしたとき（PWA）の せってい
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "にんじんダービー",
    short_name: "にんじんダービー",
    description: "べんきょうして あいばを そだて、おうまレースで あそぼう！",
    start_url: "/",
    display: "standalone",
    background_color: "#234a39",
    theme_color: "#234a39",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
