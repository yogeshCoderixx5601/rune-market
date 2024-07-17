"use client"
import React, { useState } from 'react';

const TestInput = () => {
  const [txid, setTxid] = useState('');
  const [status, setStatus] = useState('');

  async function verifyInMemepool(txid:string) {
    // console.log('VERIFY STATUS IN MEMEPOOL TRUE OR FALSE');
    // console.log('TXID IN VERIFY STATUS:', txid);
    try {
      // Connect to the database
  

      // Determine the correct URL based on the network
      const url =
        process.env.NEXT_PUBLIC_NETWORK === 'testnet'
          ? `https://mempool.space/testnet/api/tx/0ce5d1f6b546323e6b2fcb9da23be848bc36f5a4b0edd37c6600b8e527dd267e`
          : `https://mempool.space/api/tx/${txid}`;

      // Make a request to the mempool API to check the transaction status
      const response = await fetch(url);
      const data = await response.json();
      console.log(data, 'IN MEMEPOOL RESPONSE');

      // If the transaction is confirmed, update the RuneUtxo collection
      if (data.status.confirmed) {
        const outputs = data.vout.map((output:any) => `${output.txid}:${output.n}`);
        const listings = true; // Set listings according to your logic

        // if (listings) {
        //   await RuneUtxo.updateMany(
        //     { utxo_id: { $in: outputs } },
        //     {
        //       listed: true,
        //       in_mempool: true,
        //       txid,
        //     }
        //   );

        //   console.log('Updated RuneUtxo:', outputs);
        // }

        console.log('Transaction successfully broadcasted:', txid);
        setStatus('Transaction confirmed and updated.');
      } else {
        console.log('Transaction not yet confirmed:', txid);
        setStatus('Transaction not yet confirmed.');
      }
    } catch (error:any) {
      console.error('Error checking transaction status:', error.message);
      setStatus(`Error: ${error.message}`);
    }
  }

  const handleSubmit = (e:any) => {
    e.preventDefault();
    verifyInMemepool(txid);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Enter TXID:
          <input
            type="text"
            value={txid}
            onChange={(e) => setTxid(e.target.value)}
          />
        </label>
        <button type="submit">Verify</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default TestInput;
