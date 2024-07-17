import React, { useEffect, useState } from "react";
import {
  calculateTotalRunePrice,
  calculateMarketplaceFee,
  calculateAveragePrice,
  convertSatoshiToBTC,
  convertSatoshiToUSD,
  formatNumber,
  getBTCPriceInDollars,
  convertBTCPriceInDollars,
} from "@/utils";
import { Utxo } from "@/views/SingleRune";
import { useSelector } from "react-redux";
import { RootState } from "@/stores";
import mempoolJS from "@mempool/mempool.js";
import BuyRuneButton from "../BuyRuneButton";
import { RiBtcFill } from "react-icons/ri";
import { IoLogoUsd } from "react-icons/io5";
interface Props {
  selectedRunes: Utxo[];
}
import { IoIosArrowDown } from "react-icons/io";
import { IoIosArrowUp } from "react-icons/io";

const RuneTableFooter: React.FC<Props> = ({ selectedRunes }) => {
  const [feeRate, setFeeRate] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
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
  // console.log(totalRunePriceSatoshi, "----totalRunePriceSatoshi");
  const totalRunePriceBTC = convertSatoshiToBTC(totalRunePriceSatoshi);
  // console.log(totalRunePriceBTC, "-----totalRunePriceBTC");
  const totalRunePriceUSD = convertSatoshiToUSD(
    totalRunePriceSatoshi,
    BtcPrice
  );
  // console.log(totalRunePriceUSD, "-totalRunePriceUSD");

  const marketplaceFeeBTC = calculateMarketplaceFee(totalRunePriceBTC);
  // console.log(marketplaceFeeBTC, "-marketplaceFeeBTC");

  const marketplaceFeeUSD = convertBTCPriceInDollars(
    marketplaceFeeBTC,
    BtcPrice
  );
  // console.log(marketplaceFeeUSD, "--------marketplaceFeeUSD");

  const youPayBTC = totalRunePriceBTC + marketplaceFeeBTC;
  // console.log(youPayBTC, "-----youPayBTC");
  const youPayUSD = totalRunePriceUSD + marketplaceFeeUSD;
  // console.log(youPayUSD, "-------you pay usd");

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gray rounded-b px-3 py-4">
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-lg font-bold">
            <div className="flex gap-2">
              <p>You Pay:</p>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="ml-2"
              >
                {showDetails ? <IoIosArrowDown/> : <IoIosArrowUp/>}
              </button>
            </div>
            <p className="flex items-center">
              {formatNumber(youPayBTC)}{" "}
              <RiBtcFill className="pl-1 text-lg text-bitcoin_orange" />
              /<IoLogoUsd className="text-lg text-green" />
              {youPayUSD.toFixed(2)}
            </p>
          </div>
          {showDetails && (
            <>
              <div className="flex justify-between">
                <p>Total Rune Price:</p>
                <p className="flex items-center">
                  {totalRunePriceBTC.toFixed(5)}
                  <RiBtcFill className="pl-1 text-lg text-bitcoin_orange" />
                  /<IoLogoUsd className="text-lg text-green" />
                  {totalRunePriceUSD.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between">
                <p>Marketplace Fee (1%):</p>
                <p className="flex items-center">
                  {marketplaceFeeBTC.toFixed(5)}{" "}
                  <RiBtcFill className="pl-1 text-lg text-bitcoin_orange" />
                  /<IoLogoUsd className="text-lg text-green" />
                  {marketplaceFeeUSD.toFixed(2)}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1 border-t ">
          <div className="flex justify-between pt-3">
            <p>Average Price:</p>
            <p className="flex items-center">
              {formatNumber(calculateAveragePrice(selectedRunes))} SATS/
              <IoLogoUsd className="text-lg text-green" />
              {convertSatoshiToUSD(
                calculateAveragePrice(selectedRunes),
                BtcPrice
              ).toFixed(5)}
            </p>
          </div>
          <div className="flex justify-between">
            <p>Fee Rate:</p>
            <p className="flex items-center gap-1">
              {convertSatoshiToBTC(feeRate).toFixed(5)}{" "}
              <RiBtcFill className="pl-1 text-lg text-bitcoin_orange" />/
              <IoLogoUsd className="text-lg text-green" />
              {convertSatoshiToUSD(feeRate, BtcPrice).toFixed(5)}
            </p>
          </div>
        </div>

        {totalRunePriceUSD >= 1 ? (
          ""
        ) : (
          <p className="text-white text-center bg-red-800 py-2 rounded">
            Total price should be greater than $1 to proceed.
          </p>
        )}
        <BuyRuneButton
          selectedRunes={selectedRunes}
          totalRunePriceUSD={totalRunePriceUSD}
        />
      </div>
    </div>
  );
};

export default RuneTableFooter;
