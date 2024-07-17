import React from 'react';
import RuneCheckbox from '../RuneCheckbox';
import { Utxo } from '@/views/SingleRune';
import { convertSatoshiToBTC, formatNumber } from '@/utils';

interface RuneTableRowProps {
  utxo: Utxo;
  isChecked: boolean;
  onCheckboxChange: () => void;
}

const RuneTableRow: React.FC<RuneTableRowProps> = ({ utxo, isChecked, onCheckboxChange }) => {
  return (
    <tr className="border-b-[0.5px] no-scroll">
      <td className="text-white text-xs font-normal p-2">
        <RuneCheckbox
          isChecked={isChecked}
          onChange={onCheckboxChange}
          utxo={utxo}
        />
      </td>
       <td className="text-white text-sm font-normal p-2 text-right">
       {formatNumber(utxo.rune_amount)}
      </td>
      <td className="text-white text-sm font-normal p-2 text-right">
       {utxo.listed_price_per_token}
      </td>
      <td className="text-white text-sm font-normal p-2 text-right">
         {convertSatoshiToBTC(utxo.listed_price).toFixed(5)} BTC
      </td>
    </tr>
  );
};

export default RuneTableRow;

