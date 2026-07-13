import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isImageClue(clue: string | null | undefined): boolean {
  if (!clue) return false;
  const trimmed = clue.trim();
  
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const parsed = parseClues(trimmed);
    return parsed.length > 0 && isImageClue(parsed[0]);
  }
  
  return trimmed.startsWith('data:image/') || 
         trimmed.startsWith('http://') || 
         trimmed.startsWith('https://') || 
         trimmed.startsWith('/') ||
         /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(trimmed);
}

export function parseClues(clue: string | null | undefined): string[] {
  if (!clue) return [];
  const trimmed = clue.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(x => String(x));
      }
    } catch (e) {
      // Fallback
    }
  }
  return [trimmed];
}
