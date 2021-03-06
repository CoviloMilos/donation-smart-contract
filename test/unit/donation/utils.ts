const ERROR = {
  ONLY_ONWER: "Ownable: caller is not the owner",
  OWNER_REVOKE: "Owner must be admin",
  CALLER_NOT_ADMIN: "CallerNotAdmin()",
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
  ADMIN_ASSIGNED: "AdminAssigned",
  ADMIN_REVOKED: "AdminRevoked",
  CAMPAIGN_CREATED: "CampaignCreated",
  DONATION_CREATED: "DonationCreated",
  FUNDS_WITHDRAWED: "FundsWithdrawed",
  CAMPAIGN_ARCHIVED: "CampaignArchived",
  CAMPAIGN_TIME_GOAL_REACHED: "CampaignTimeGoalReached",
};

enum CampaignStatus {
  NOT_FOUND,
  IN_PROGRESS,
  COMPLETED,
  ARCHIVED,
}

export { ERROR, EVENT, CampaignStatus };
