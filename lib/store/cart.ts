"use client";

import { useSyncExternalStore } from "react";
import type { PackageGroup } from "./catalog";

export type CartPick = { group: PackageGroup; title: string; he: string; quantity: number };

export type CartLine = {
  key: string;
  handle: string;
  variant: string;
  choice: string;
  options: string[];
  title: string;
  he: string;
  image: string;
  price: number;
  quantity: number;
  friday: boolean;
  special: boolean;
  picks?: CartPick[];
};

const KEY = "duba_cart";
const listeners = new Set<() => void>();
const empty: CartLine[] = [];
let cache: CartLine[] | null = null;

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  localStorage.setItem(KEY, JSON.stringify(lines));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => empty);
}

const noop = () => () => {};

export function useCartReady() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function addLine(line: Omit<CartLine, "key">) {
  const lines = read();
  const key = `${line.handle}|${line.variant}|${line.choice}`;
  const existing = line.picks ? undefined : lines.find((item) => item.key === key);
  if (existing) {
    write(lines.map((item) => (item === existing ? { ...item, quantity: Math.min(50, item.quantity + line.quantity) } : item)));
    return;
  }
  write([...lines, { ...line, key: line.picks ? `${key}|${Date.now()}` : key }]);
}

export function setQuantity(key: string, quantity: number) {
  const lines = read();
  if (quantity < 1) {
    write(lines.filter((item) => item.key !== key));
    return;
  }
  write(lines.map((item) => (item.key === key ? { ...item, quantity: Math.min(50, quantity) } : item)));
}

export function clearCart() {
  write([]);
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}
