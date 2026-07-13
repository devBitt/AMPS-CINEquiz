import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isImageClue(clue: string | null | undefined): boolean {
  if (!clue) return false;
  const trimmed = clue.trim();
  return trimmed.startsWith('data:image/') || 
         trimmed.startsWith('http://') || 
         trimmed.startsWith('https://') || 
         trimmed.startsWith('/') ||
         /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(trimmed);
}
