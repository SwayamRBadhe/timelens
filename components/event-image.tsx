"use client";
import Image from "next/image";
import { useState } from "react";
export function EventImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // Optional upstream media loads in the browser; no arbitrary server-side image proxying.
  return (
    <Image
      className="event-image"
      src={url}
      alt=""
      width={720}
      height={440}
      unoptimized
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
