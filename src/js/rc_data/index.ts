import RCDataAbstract from "./RCDataAbstract";
import RCDataArticle from "./RCDataArticle";
import RCDataLog from "./RCDataLog";
import RCDataFandomDiscussion from "./RCDataFandomDiscussion";
import RC_TYPE from "../types/RC_TYPE";

export type RCData = RCDataArticle | RCDataLog | RCDataFandomDiscussion;

export { RCDataAbstract, RCDataArticle, RCDataLog, RCDataFandomDiscussion, RC_TYPE };