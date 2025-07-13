
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
  const digitsOnly = value.replace(/\D/g, '');
  
  // Start with the country code for Uzbekistan
  let uzbekistanCode = "998";
  
  // Get the part of the number after the country code
  let numberPart = digitsOnly;
  if (numberPart.startsWith(uzbekistanCode)) {
      numberPart = numberPart.substring(uzbekistanCode.length);
  }

  const phoneNumberLength = numberPart.length;

  let formattedNumber = `+${uzbekistanCode}`;
  
  if (phoneNumberLength > 0) {
    formattedNumber += ` (${numberPart.substring(0, 2)}`;
  }
  if (phoneNumberLength >= 3) {
    formattedNumber += `) ${numberPart.substring(2, 5)}`;
  }
  if (phoneNumberLength >= 6) {
    formattedNumber += `-${numberPart.substring(5, 7)}`;
  }
  if (phoneNumberLength >= 8) {
    formattedNumber += `-${numberPart.substring(7, 9)}`;
  }

  return formattedNumber;
}

export function deformatPhoneNumber(formattedValue: string): string {
  return formattedValue.replace(/\D/g, '');
}
