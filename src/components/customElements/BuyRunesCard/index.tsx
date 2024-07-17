import React, { useEffect, useState } from "react";
import {
  calculateTotalRunePrice,
  calculateMarketplaceFee,
  calculateAveragePrice,
  convertSatoshiToBTC,
  convertSatoshiToUSD,
} from "@/utils";
import { Utxo } from "@/views/SingleRune";
import { useSelector } from "react-redux";
import { RootState } from "@/stores";
import mempoolJS from "@mempool/mempool.js";
import BuyRuneButton from "../BuyRuneButton";

interface Props {
  selectedRunes: Utxo[];
}

const RuneTableFooter: React.FC<Props> = ({ selectedRunes }) => {
  const [feeRate, setFeeRate] = useState(0);
  const BtcPrice = useSelector(
    (state: RootState) => state.general.btc_price_in_dollar
  );

  const fee = async () => {
    const {
      bitcoin: { fees },
    } = mempoolJS({
      hostname: "mempool.space",
      network: "testnet",
    });
    const feesRecommended = await fees.getFeesRecommended();
    setFeeRate(feesRecommended.fastestFee + 10);
  };

  useEffect(() => {
    fee();
  }, []);

  const totalRunePriceSatoshi = calculateTotalRunePrice(selectedRunes);
  const totalRunePriceBTC = convertSatoshiToBTC(totalRunePriceSatoshi);
  const totalRunePriceUSD = convertSatoshiToUSD(totalRunePriceBTC, BtcPrice);

  const marketplaceFeeBTC = calculateMarketplaceFee(totalRunePriceBTC);
  const marketplaceFeeUSD = convertSatoshiToUSD(marketplaceFeeBTC, BtcPrice);

  const youPayBTC = totalRunePriceBTC + marketplaceFeeBTC;
  const youPayUSD = totalRunePriceUSD + marketplaceFeeUSD;

  return (
    <div className="absolute bottom-0 left-0 w-full bg-[#8e8e8e] rounded-b px-3 py-4">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-lg font-bold">
          <p>You Pay:</p>
          <p>
            {youPayBTC.toFixed(5)} BTC/${youPayUSD.toFixed(2)}
          </p>
        </div>
        <div className="flex justify-between">
          <p>Total Rune Price:</p>
          <p>
            {totalRunePriceBTC.toFixed(5)} BTC/${totalRunePriceUSD.toFixed(2)}
          </p>
        </div>
        <div className="flex justify-between">
          <p>Marketplace Fee (1%):</p>
          <p>
            {marketplaceFeeBTC.toFixed(5)} BTC/${marketplaceFeeUSD.toFixed(2)}
          </p>
        </div>
        <div className="flex justify-between">
          <p>Average Price:</p>
          <p>
            {calculateAveragePrice(selectedRunes)} SATS/$
            {convertSatoshiToUSD(
              calculateAveragePrice(selectedRunes),
              BtcPrice
            ).toFixed(5)}
          </p>
        </div>
        <div className="flex justify-between">
          <p>Fee Rate:</p>
          <p>
            {convertSatoshiToBTC(feeRate).toFixed(5)} BTC/$
            {convertSatoshiToUSD(feeRate, BtcPrice).toFixed(5)}
          </p>
        </div>
        {totalRunePriceUSD >= 1 ? (
          ""
        ) : (
          <p className="text-white text-center bg-red-800 py-2 rounded">
            Total price should be greater than $1 to proceed.
          </p>
        )}
        <BuyRuneButton selectedRunes={selectedRunes} totalRunePriceUSD={totalRunePriceUSD}/>
      </div>
    </div>
  );
};

export default RuneTableFooter;

