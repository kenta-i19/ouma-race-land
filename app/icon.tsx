import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/iconArt";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={512} height={512} src={logoDataUri()} alt="" />
      </div>
    ),
    size
  );
}
