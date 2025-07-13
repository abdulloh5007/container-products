
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  if (!name) return "";
  const words = name.split(' ');
  if (words.length > 1) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function formatPhoneNumber(value: string): string {
  if (!value) return '';

  const phoneNumber = value.replace(/\D/g, '');
  const phoneNumberLength = phoneNumber.length;

  if (phoneNumberLength < 4) return `+${phoneNumber}`;

  let formattedNumber = `+${phoneNumber.substring(0, 3)}`;

  if (phoneNumberLength > 3) {
    formattedNumber += ` (${phoneNumber.substring(3, 5)}`;
  }
  if (phoneNumberLength >= 6) {
    formattedNumber += `) ${phoneNumber.substring(5, 8)}`;
  }
  if (phoneNumberLength >= 9) {
    formattedNumber += `-${phoneNumber.substring(8, 10)}`;
  }
  if (phoneNumberLength >= 11) {
    formattedNumber += `-${phoneNumber.substring(10, 12)}`;
  }

  return formattedNumber;
}

export function deformatPhoneNumber(formattedValue: string): string {
  return formattedValue.replace(/\D/g, '');
}

    