function calculateTxFee(
  vinsLength: number,
  voutsLength: number,
  feeRate: number,
  inputAddressType: "pwpkh" | "taproot" | "p2sh_p2wpkh",
  outputAddressType: "pwpkh" | "taproot" | "p2sh_p2wpkh",
  includeChangeOutput: 0 | 1 = 1,
  changeAddressType: "pwpkh" | "taproot" | "p2sh_p2wpkh" = "pwpkh"
): number {
  const inputSizes = {
    pwpkh: { base: 31, witness: 107 },
    taproot: { base: 43, witness: 65 },
    p2sh_p2wpkh: { base: 58, witness: 107 },
  };

  const outputSizes = {
    pwpkh: 31,
    taproot: 43,
    p2sh_p2wpkh: 32,
  };

  // Calculate transaction overhead, considering whether any input uses SegWit
  function getTxOverhead(
    vins: number,
    vouts: number,
    isSegWit: boolean
  ): number {
    return (
      10 + // Basic non-witness transaction overhead (version, locktime)
      getSizeOfVarInt(vins) + // Input count
      getSizeOfVarInt(vouts) + // Output count
      (isSegWit ? 2 : 0)
    ); // SegWit marker and flag only if SegWit inputs are present
  }

  let totalBaseSize = getTxOverhead(
    vinsLength,
    voutsLength,
    inputAddressType.startsWith("p2")
  );
  let totalWitnessSize = 0;

  // Calculate total base size and witness size for inputs
  for (let i = 0; i < vinsLength; i++) {
    totalBaseSize += inputSizes[inputAddressType].base;
    totalWitnessSize += inputSizes[inputAddressType].witness;
  }

  // Calculate total base size for outputs
  totalBaseSize += voutsLength * outputSizes[outputAddressType];

  // Include change output if specified
  if (includeChangeOutput) {
    totalBaseSize += outputSizes[changeAddressType];
  }

  // Calculate total vbytes considering witness discount for SegWit inputs
  const totalVBytes = totalBaseSize + Math.ceil(totalWitnessSize / 4);
  const fee = totalVBytes * feeRate;

  console.log(
    `Final Transaction Size: ${totalVBytes} vbytes, Fee Rate: ${feeRate}, Calculated Fee: ${fee}`,
    { totalVBytes, feeRate, fee }
  );

  return fee;
}

function getSizeOfVarInt(length: number): number {
  if (length < 253) {
    return 1;
  } else if (length < 65536) {
    return 3;
  } else if (length < 4294967296) {
    return 5;
  } else {
    return 9; // Handling very large counts
  }
}

export default calculateTxFee;
