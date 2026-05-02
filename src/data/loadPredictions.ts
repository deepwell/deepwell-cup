import raw from "./predictions.json";
import type { PredictionsFile } from "../domain/types";

export const predictions: PredictionsFile = raw as PredictionsFile;
