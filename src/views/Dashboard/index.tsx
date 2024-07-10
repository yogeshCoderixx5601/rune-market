"use client"
import { useWalletAddress } from 'bitcoin-wallet-adapter';
import React, { useEffect, useState } from 'react'
import RuneUtxos from './RuneUtxos';
import { getRuneUtxos } from '@/apiHelper/getUserRunes';

interface Rune {
  _id: string;
  name: string;
  amount: number;
}

const ListUtxosPage = () => {

    const walletDetails = useWalletAddress();
    const [runes, setRunes] = useState<Rune[]>([]);
    const [expandedRuneId, setExpandedRuneId] = useState<string | null>(null);
  console.log(runes, "------------runes in dashbord")
  
    const getRunesDetails = async () => {
      try {
        if (walletDetails && walletDetails.wallet && walletDetails.connected) {
          // const ordinal_address = "tb1p4yf3n8e3sqnnvnkhzp3c9kydhx0afm03d73vvsg32vldrs9rthvsqqlyc8"
          const response = await getRuneUtxos(walletDetails.ordinal_address);
          console.log(response?.data?.result[0],"utxos dashbord")
          setRunes(response?.data?.result[0].runes);
        }
      } catch (error) {
        console.log(error, "error");
      }
    };
  
    useEffect(() => {
      getRunesDetails();
    }, [walletDetails]);

    const handleRuneClick = (rune: Rune) => {
      if (expandedRuneId === rune._id) {
        setExpandedRuneId(null); // Collapse dropdown if already expanded
      } else {
        setExpandedRuneId(rune._id); // Expand dropdown for the clicked rune
      }
    };
    console.log("rune:",runes)
    return (
      <div className='w-full flex flex-col gap-6 p-6'>
        <div className="">Rune Details</div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-customPurple_950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rune
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className=" divide-y divide-customPurple_950  w-full">
            {runes?.map((rune) => (
              <React.Fragment key={rune._id} >
                <tr className='p-4 bg-customPurple_900 w-full mb-10'>
                  <td className="px-6 py-4 whitespace-nowrap">{rune.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{rune.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">total in btc and usd</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleRuneClick(rune)}
                      className="custom-gradient text-white font-bold py-2 px-4 rounded"
                    >
                      {expandedRuneId === rune._id ? "Hide Utxos" : "Show Utxos"}
                    </button>
                  </td>
                </tr>
                {expandedRuneId === rune._id && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 bg-customPurple_950">
                      <RuneUtxos rune={rune.name} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
  )
}

export default ListUtxosPage