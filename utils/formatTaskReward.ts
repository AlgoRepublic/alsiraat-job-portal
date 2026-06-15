/** @deprecated Import from `./rewardType` instead. */
export {
  formatTaskRewardDisplay,
  findRewardTypeInCatalog,
  resolveRewardTypeConfig,
  getRewardFormFieldConfig,
  type RewardTypeRecord,
  type TaskRewardFields,
} from "./rewardType";

/** @deprecated Use RewardTypeRecord */
export type RewardTypeMeta = import("./rewardType").RewardTypeRecord;
