"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    const images = Array.from(document.images).filter(
      (image) => !image.complete,
    );
    let printed = false;
    const print = () => {
      if (printed) return;
      printed = true;
      window.print();
    };
    if (images.length === 0) {
      const timer = setTimeout(print, 300);
      return () => clearTimeout(timer);
    }
    let left = images.length;
    const done = () => {
      left -= 1;
      if (left === 0) print();
    };
    images.forEach((image) => {
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    });
    const fallback = setTimeout(print, 4000);
    return () => clearTimeout(fallback);
  }, []);

  return null;
}
