"use client";

import { getUniqueRunes } from "@/apiHelper/v2/getUniqueRunes";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { CircularProgress } from "@mui/material";
import { formatNumber } from "@/utils";

interface RuneToken {
  total_amount: number;
  rune_name: string;
  rune_symbol: string;
  rune_divisibility: number;
  total_utxos: number;
  listed_price_per_token:number;
}

const RunePage = () => {
  const [runes, setRunes] = useState<RuneToken[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const fetchUniqueRunes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUniqueRunes();
      setRunes(response?.data?.result); // Set runes state with fetched data
    } catch (error) {
      console.error("Error fetching runes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniqueRunes();
  }, [fetchUniqueRunes]);

  const handleRuneClick = (rune: RuneToken) => {
    // console.log(rune, "RUNE");
    router.push(`/runes/${rune.rune_name}`);
  };

  if (loading) {
    return (
      <div className="text-white flex items-center justify-center h-screen">
        <CircularProgress color="inherit" className="sm:w-20 md:w-60" />
      </div>
    );
  }

  return (
    <div className="">
      <div className="text-2xl text-[#f2f2f3] font-bold p-6">Top Runes</div>
      <div className="overflow-x-auto w-full p-6">
        <table className="min-w-full table-auto p-6 rounded bg-customPurple_950">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2 text-left">Rune</th>
               <th className="px-4 py-2 text-right">Total Amount</th>
              <th className="px-4 py-2 text-right">Price (sats/unit)</th>
              <th className="px-4 py-2 text-right">Listings</th>
            </tr>
          </thead>
          <tbody className="">
            {runes?.map((rune, index) => (
              <tr
                key={index}
                className="border-b border-gray-200 cursor-pointer hover:bg-customPurple_900"
                onClick={() => handleRuneClick(rune)}
              >
                <td className="px-4 py-2 text-center">{index + 1}</td>
                <td className="px-4 py-4 text-left">{rune.rune_name}</td>
                 <td className="px-4 py-2 text-right">{formatNumber(rune.total_amount)}</td>
                <td className="px-4 py-2 text-right text-sm">
                  {rune.listed_price_per_token}{" "}
                  sats
                </td>
                <td className="px-4 py-2 text-right">{rune.total_utxos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RunePage;
