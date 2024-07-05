import { model, models } from "mongoose";
import { userSchema } from "./User";
import { utxoSchema } from "./Utxo";

const User =
  models.User || model("User", userSchema);
  const RuneUtxo = models.Utxo || model("Utxo", utxoSchema)

 export {User, RuneUtxo}