import { Utxo } from "@/views/SingleRune";
import axios from "axios";

export function shortenString(str: string, length?: number): string {
  if (str.length <= (length || 8)) {
    return str;
  }
  const start = str.slice(0, 8);
  const end = str.slice(-8);
  return `${start}...${end}`;
}

export async function getBTCPriceInDollars() {
  try {
    const response = await fetch(
      "https://api.coinbase.com/v2/prices/BTC-USD/spot"
    );
    const data = await response.json();
    const priceInDollars = Number(data["data"]["amount"]);
    return priceInDollars;
  } catch (error) {
    console.error("Error fetching BTC price:", error);
    return null;
  }
}

export function convertBTCPriceInDollars(marketplaceFeeBTC:number,btcPrice:number){
   const priceInUSD = marketplaceFeeBTC * btcPrice;
    return priceInUSD;
}

export function convertSatoshiToBTC(satoshi: number) {
  const SATOSHI_IN_ONE_BTC = 100000000;
  return satoshi / SATOSHI_IN_ONE_BTC;
}

export function convertSatoshiToUSD(satoshi: number, btcPrice: number) {
  const SATOSHI_IN_ONE_BTC = 100000000;
  return (satoshi / SATOSHI_IN_ONE_BTC) * btcPrice;
}

export const satsToDollars = async (sats: number) => {
  // Fetch the current bitcoin price from session storage
  const bitcoin_price = await getBitcoinPriceFromCoinbase();
  // Convert satoshis to bitcoin, then to USD
  const value_in_dollars = (sats / 100_000_000) * bitcoin_price;
  return value_in_dollars;
};

export const getBitcoinPriceFromCoinbase = async () => {
  var { data } = await axios.get(
    "https://api.coinbase.com/v2/prices/BTC-USD/spot"
  );
  var price = data.data.amount;
  return price;
};

// export function calculatePricePerUnit(
//   totalAmount: number,
//   divisibility: number
// ) {
//   const totalPrice = 1000000;
//   const pricePerUnit = totalPrice / (totalAmount * Math.pow(10, divisibility));
//   return pricePerUnit;
// }

// Function to calculate total rune price based on selected runes
export const calculateTotalRunePrice = (selectedRunes: Utxo[]): number => {
  return selectedRunes.reduce((total, rune) => {
    return total + (rune.listed_price ?? 0); // Assuming listed_price exists on Utxo
  }, 0);
};

// Function to calculate marketplace fee (1% of total rune price)
export const calculateMarketplaceFee = (totalRunePrice: number): number => {
  return totalRunePrice * 0.01; // 1% marketplace fee
};

export const calculateAveragePrice = (selectedRunes: Utxo[]): number => {
  return selectedRunes.reduce((total, rune) => {
    return total + (rune.listed_price / rune.rune_amount ?? 0); // Assuming rune_amount exists on Utxo
  }, 0);
};


export function formatNumber(num: number) {
  if (num >= 1e9) {
    // Billions
    return (num / 1e9).toFixed(1) + "B";
  } else if (num >= 1e6) {
    // Millions
    return (num / 1e6).toFixed(1) + "M";
  } else if (num >= 1e3) {
    // Thousands
    return (num / 1e3).toFixed(1) + "K";
  } else {
    return num.toString();
  }
}

