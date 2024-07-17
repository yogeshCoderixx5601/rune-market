import React from "react";
import { FaPlus } from "react-icons/fa";
import { TiTick } from "react-icons/ti";

interface RuneCheckboxProps {
  isChecked: boolean;
  onChange: () => void;
  utxo: any;
}

const RuneCheckbox: React.FC<RuneCheckboxProps> = ({
  isChecked,
  onChange,
  utxo,
}) => {

    console.log(utxo,"UTXO IN CHECKBOX")
  return (
    <div className="custom-checkbox flex items-center gap-2">
      <input
        type="checkbox"
        id={`checkbox-${utxo._id}`}
        checked={isChecked}
        onChange={onChange}
        hidden
      />
      {isChecked ? <label
        htmlFor={`checkbox-${utxo._id}`}
        className={`custom-label  flex justify-center items-center rounded-full text-lg text-customPurple_800 font-extrabold`}
      > 
        <TiTick />
      </label> : <label
        htmlFor={`checkbox-${utxo._id}`}
        className={`custom-label  flex justify-center items-center rounded-full text-lg text-customPurple_800 font-extrabold"`}
      > 
        
        <FaPlus />
      </label>}
      <span>{utxo.rune_name}</span>
    </div>
  );
};

export default RuneCheckbox;
