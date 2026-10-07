"use client";

import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return <div className="aspect-square rounded-lg bg-[#1a1a1a]" />;
  return (
    <div>
      <img src={images[index]} alt={alt} className="aspect-square w-full rounded-lg object-cover" />
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, position) => (
            <button
              key={image}
              type="button"
              onClick={() => setIndex(position)}
              className={`size-20 shrink-0 overflow-hidden rounded-md border-2 ${position === index ? "border-white" : "border-transparent opacity-70"}`}
              aria-label={`${alt} ${position + 1}`}
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
