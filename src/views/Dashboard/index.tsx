"use client"
import { getRunes } from '@/utils/GetRunes';
import { useWalletAddress } from 'bitcoin-wallet-adapter';
import React, { useEffect, useState } from 'react'

const ListUtxosPage = () => {

    const walletDetails = useWalletAddress();
    // const [runes, setRunes] = useState<Rune[]>([]);
    const [expandedRuneId, setExpandedRuneId] = useState<string | null>(null);
  
  
    const getRunesDetails = async () => {
      try {
        if (walletDetails && walletDetails.wallet && walletDetails.connected) {
          const ordinal_address = "bc1qm045gn6vk6umsq3p7qjp0z339l9ksqyt7cwnnr";
          const response = await getRunes(ordinal_address);
        //   setRunes(response?.data?.result[0].runes);
        }
      } catch (error) {
        console.log(error, "error");
      }
    };
  
    useEffect(() => {
      getRunesDetails();
    }, [walletDetails]);
  return (
    <div>ListUtxosPage</div>
  )
}

export default ListUtxosPage