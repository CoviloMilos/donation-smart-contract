import { ethers } from "hardhat";

const ERROR = {
  ONLY_ONWER: "Ownable: caller is not the owner",
  EMPTY_STRING: "EmptyString()",
  INVALID_TIME_GOAL: "InvalidTimeGoal()",
  INVALID_MONEY_GOAL: "InvalidMoneyGoal()",
  CAMPAIGN_NOT_FOUND: "CampaignNotFound()",
  CAMPAIGN_COMPLETED: "CampaignCompleted()",
  INSUFFICIENT_DONATION: "InsufficientDonation()",
  CAMPAIGN_IN_PROGRESS: "CampaignInProgress()",
  WITHDRAW_FORBIDDEN: "WithdrawForbidden()",
};

const EVENT = {
  CAMPAIGN_CREATED: "CampaignCreated",
  DONATION_CREATED: "DonationCreated",
  FUNDS_WITHDRAWED: "FundsWithdrawed",
  CAMPAIGN_ARCHIVED: "CampaignArchived",
  CAMPAIGN_TIME_GOAL_REACHED: "CampaignTimeGoalReached",
  DONATOR_AWARDED: "DonatorAwarded",
};

enum CampaignStatus {
  NOT_FOUND,
  IN_PROGRESS,
  COMPLETED,
  ARCHIVED,
}

const getValidTimeGoal = async (addOn?: number) => {
  let { timestamp } = await ethers.provider.getBlock("latest");
  if (addOn) timestamp += addOn;
  else timestamp += 1;

  return timestamp;
};

const tokenID = 1;
export { ERROR, EVENT, CampaignStatus, getValidTimeGoal, tokenID };
