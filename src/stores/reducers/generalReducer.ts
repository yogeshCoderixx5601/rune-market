import { IBalanceData, IUser } from "@/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
  btc_price_in_dollar: number;
  user: IUser|null;
  new_activity: boolean;
  balanceData: IBalanceData | null;
} = {
  btc_price_in_dollar: 0,
  user: null,
  new_activity: false,
  balanceData: null,
};

const generalSlice = createSlice({
  name: "general",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<IUser | null>) => {
      state.user = action.payload;
    },
    setBTCPrice: (state, action: PayloadAction<number>) => {
      state.btc_price_in_dollar = action.payload;
    },
    setNewActivity: (state, action: PayloadAction<boolean>) => {
      state.new_activity = action.payload;
    },
  },
});

export const { setBTCPrice, setUser, setNewActivity, } =
  generalSlice.actions;
export default generalSlice.reducer;
