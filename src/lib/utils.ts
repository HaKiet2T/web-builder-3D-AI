import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn - Helper gop class Tailwind CSS an toan, tranh xung dot.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
