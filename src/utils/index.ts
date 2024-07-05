import axios from "axios";

export function shortenString(str: string, length?: number): string {
    if (str.length <= (length || 8)) {
      return str;
    }
    const start = str.slice(0, 8);
    const end = str.slice(-8);
    return `${start}...${end}`;
  }