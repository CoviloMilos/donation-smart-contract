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

    enum CampaignStatus {
        NOT_FOUND,
        IN_PROGRESS,
        COMPLETED,
        ARCHIVED
    }

    struct Campaign {
        string name;
        string description;
        uint timeGoal;
        uint256 moneyToRaisGoal;
        uint256 balance;
        address campaignManager;
        bool registered;
        CampaignStatus status;
    }

    Counters.Counter public campaignIdentifer;
    Counters.Counter public archivedCampaignIdentifer;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Campaign) public archivedCampaigns;

    mapping(address => bool) public admins;

    constructor() {
        admins[owner()] = true;
    }

    event AdminAssigned(address admin);
    event AdminRevoked(address admin);
    event CampaignCreated(address indexed creator, address indexed campaignManager, uint256 campaignId, string name);
    event DonationCreated(address indexed donator, uint256 amount);
    event FundsWithdrawed(address indexed receiver, uint256 amount);
    event CampaignArchived(uint256 campaignId);

    error EmptyString();
    error InvalidMoneyGoal();
    error InvalidTimeGoal();
    error CallerNotAdmin();
    error CampaignCompleted();
    error CampaignInProgress();
    error CampaignNotFound();
    error InsufficientDonation();
    error FundsTransferFail();
    error WithdrawForbidden();

    modifier onlyAdmin() {
        if (!admins[msg.sender]) revert CallerNotAdmin();
        _;
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

    function assignAdmin(address admin) public onlyOwner {
        admins[admin] = true;
        emit AdminAssigned(admin);
    }

    function revokeAdmin(address admin) public onlyOwner {
        require(admin != owner(), "Contract owner can't be removed from admins list");
        delete admins[admin];
        emit AdminRevoked(admin);
    }

    /// @notice Create campaign only by registered admins. Contact admin in order to create campaign
    /// @dev validateString Modifier for checking if string is empty
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
    ) public onlyAdmin validateString(name) validateString(description) {
        if (block.timestamp > timeGoal) revert InvalidTimeGoal();
        if (moneyToRaisGoal == 0) revert InvalidMoneyGoal();

        campaignIdentifer.increment();
        campaigns[campaignIdentifer.current()] = Campaign(name, description, timeGoal, moneyToRaisGoal, 0, campaignManager, true, CampaignStatus.IN_PROGRESS);

        emit CampaignCreated(msg.sender, campaignManager, campaignIdentifer.current(), name);
    }

    /// @notice Send donation to specific campaign. Only applies on campaings which have IN_PROGRESS status. Donations less or equal to 0 are rejected
    /// @dev ableToDonate Modifier for checking if campaign has IN_PROGRESS status or if exist
    /// @dev validateDonation Modifier for checking if msg.value <= 0
    /// @param campaignId Used to identify campaign
    function donate(uint256 campaignId) public payable ableToDonate(campaignId) validateDonation {
        Campaign storage campaign = campaigns[campaignId];
        campaign.balance += msg.value;

        if (moneyGoalReached(campaign.balance, campaign.moneyToRaisGoal) || timeGoalReached(campaign.timeGoal)) {
            campaign.status = CampaignStatus.COMPLETED;
        }

        emit DonationCreated(msg.sender, msg.value); 
    }

    /// @notice Withdraw funds to campaign manager only if campaign is in COMPLETED status
    /// @dev campaignCompleted Modifier for checking if campaign is COMPLETED
    /// @param campaignId Used to identify campaign
    function withdrawFunds(uint256 campaignId) public campaignCompleted(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.campaignManager != msg.sender) revert WithdrawForbidden();

        (bool success, ) = payable(msg.sender).call{ value: campaign.balance }("");
        if (!success) revert FundsTransferFail();

        campaign.balance = 0;

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

    function moneyGoalReached(uint256 balance, uint256 moneyGoal) private pure returns(bool) {
        return balance >= moneyGoal;
    }

    function timeGoalReached(uint256 timeGoal) private view returns(bool) {
        return block.timestamp >= timeGoal;
    }
}