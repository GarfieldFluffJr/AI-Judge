import * as admin from "firebase-admin";

admin.initializeApp();

export { runBatchEvaluation } from "./evaluations/runBatch";
