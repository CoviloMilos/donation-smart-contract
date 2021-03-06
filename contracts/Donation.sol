// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title Donation simulator
/// @author Milos Covilo
/// @notice You can use this contract for only the most basic campaign donations
/// @dev All function calls are currently implemented without side effects
/// @custom:experimental This is an experimental contract.
contract Donation is Ownable {
    using Counters for Counters.Counter;

    struct HighestDonation {
        address donor;
        uint256 amount;
    }

    enum CampaignStatus {
        NOT_FOUND,
        IN_PROGRESS,
        COMPLETED,
        ARCHIVED
    }

    struct Campaign {
        string name;
        string description;
        uint256 timeGoal;
        uint256 moneyToRaisGoal;
        uint256 balance;
        address campaignManager;
        CampaignStatus status;
    }

    Counters.Counter public campaignIdentifer;
    mapping(uint256 => Campaign) public campaigns;

    Counters.Counter public archivedCampaignIdentifer;
    mapping(uint256 => Campaign) public archivedCampaigns;

    HighestDonation public highestDonation;

    bool internal locked;

    constructor() {}

    event CampaignCreated(address indexed creator, address indexed campaignManager, uint256 campaignId, string name);
    event DonationCreated(address indexed donator, uint256 amount);
    event FundsWithdrawed(address indexed receiver, uint256 amount);
    event CampaignArchived(uint256 campaignId);
    event CampaignTimeGoalReached();

    error EmptyString();
    error InvalidMoneyGoal();
    error InvalidTimeGoal();
    error CampaignCompleted();
    error CampaignInProgress();
    error CampaignNotFound();
    error InsufficientDonation();
    error FundsTransferFail();
    error WithdrawForbidden();


    modifier noReentrant() {
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }

    modifier validateString(string calldata value) {
        if (bytes(value).length == 0) revert EmptyString();
        _;
    }

    modifier ableToDonate(uint256 id) {
        Campaign memory campaign = campaigns[id];
        if (campaign.status == CampaignStatus.NOT_FOUND) revert CampaignNotFound();
        if (campaign.status == CampaignStatus.COMPLETED) revert CampaignCompleted();
        _;
    }

    modifier campaignCompleted(uint256 id) {
        Campaign memory campaign = campaigns[id];
        if (campaign.status == CampaignStatus.NOT_FOUND) revert CampaignNotFound();
        if (campaign.status != CampaignStatus.COMPLETED) revert CampaignInProgress();
        _;
    }

    modifier validateDonation() {
        if (msg.value == 0) revert InsufficientDonation();
        _;
    }

    /// @notice Create campaign only by registered owner.
    /// @dev Function has custom modifiers for validating funtion arguments. If all checks are passed CampaignCreated event is emmited
    /// @param name Name of campaign
    /// @param description Description of campaign
    /// @param timeGoal The time goal of campaign
    /// @param moneyToRaisGoal The money goal of campaign
    /// @param campaignManager Wallet address where campign funds should be transfered
    function createCampaign(
        string calldata name, 
        string calldata description, 
        uint timeGoal, 
        uint moneyToRaisGoal, 
        address campaignManager
    ) public onlyOwner validateString(name) validateString(description) {
        if (block.timestamp > timeGoal) revert InvalidTimeGoal();
        if (moneyToRaisGoal == 0) revert InvalidMoneyGoal();

        campaignIdentifer.increment();
        campaigns[campaignIdentifer.current()] = Campaign(name, description, timeGoal, moneyToRaisGoal, 0, campaignManager, CampaignStatus.IN_PROGRESS);

        emit CampaignCreated(msg.sender, campaignManager, campaignIdentifer.current(), name);
    }

    /// @notice Send donation to specific campaign. Only applies on campaings which have IN_PROGRESS status. Donations less or equal to 0 are rejected
    /// @dev Function has custom modifiers for validating funtion arguments. If all checks are passed DonationCreated event is emmited
    /// @dev ableToDonate Modifier for checking if campaign has IN_PROGRESS status or if exist
    /// @param campaignId Used to identify campaign
    function donate(uint256 campaignId) public payable ableToDonate(campaignId) validateDonation {
        Campaign storage campaign = campaigns[campaignId];

        if (timeGoalReached(campaign.timeGoal)) {
            campaign.status = CampaignStatus.COMPLETED;
            
            // Find elegant way to complete campaign when time goal is reached.
            // Because in this case someone need to spend gas so campaign could become completed
            payback(msg.value);
            emit CampaignTimeGoalReached();
        } else {
            uint256 newBalance = campaign.balance + msg.value;
            uint256 donation = msg.value;
            
            if (moneyGoalReached(newBalance, campaign.moneyToRaisGoal)) {
                campaign.status = CampaignStatus.COMPLETED;
                uint256 balanceDiff = newBalance - campaign.moneyToRaisGoal;

                if (balanceDiff > 0) {
                    donation -= balanceDiff;
                    payback(balanceDiff);
                }
            }

            campaign.balance += donation;

            if (donation > highestDonation.amount) {
                highestDonation = HighestDonation(msg.sender, donation);
            }

            emit DonationCreated(msg.sender, msg.value);
        } 
    }

    /// @notice Withdraw funds to campaign manager only if campaign is in COMPLETED status
    /// @dev campaignCompleted Modifier for checking if campaign is COMPLETED
    /// @param campaignId Used to identify campaign
    function withdrawFunds(uint256 campaignId) public noReentrant campaignCompleted(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.campaignManager != msg.sender) revert WithdrawForbidden();

        campaign.balance = 0;

        (bool success, ) = payable(msg.sender).call{ value: campaign.balance }("");
        if (!success) revert FundsTransferFail();

        emit FundsWithdrawed(campaign.campaignManager, campaign.balance);

        archiveCampaign(campaignId, campaign);
    }

    /// @notice Archive campaign after withdraw. This is not public function
    /// @dev Withdrawed campaings are archived for optimizing campaign search
    /// @param campaignId Used to delete campaign from mapping
    /// @param campaign To be archived
    function archiveCampaign(uint256 campaignId, Campaign storage campaign) private {
        campaign.status = CampaignStatus.ARCHIVED;
        archivedCampaignIdentifer.increment();
        archivedCampaigns[archivedCampaignIdentifer.current()] = campaign;

        delete campaigns[campaignId];

        emit CampaignArchived(archivedCampaignIdentifer.current());
    }

    /// @notice Function used for transfering funds
    /// @param amount Amount of tokens
    function payback(uint amount) private {
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert FundsTransferFail();
    }


    /// @notice Helper function to check if campaign money goal is reached
    /// @param balance Balance to be compared
    /// @param moneyGoal Campaign money goal
    function moneyGoalReached(uint256 balance, uint256 moneyGoal) private pure returns(bool) {
        return balance >= moneyGoal;
    }

    /// @notice Helper function to check if campaign time goal is reached
    /// @dev timeGoal is compared to block's timestamp
    /// @param timeGoal Campaign time goal
    function timeGoalReached(uint256 timeGoal) private view returns(bool) {
        return block.timestamp >= timeGoal;
    }
}