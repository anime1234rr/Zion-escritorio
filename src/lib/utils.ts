import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { formatErrorMessage } from '@/lib/internal/core-utils'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown): string {
  return formatErrorMessage(err)
}
