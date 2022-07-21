// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IDonation  {
    function createCampaign(
        string calldata name, 
        string calldata description, 
        uint timeGoal, 
        uint moneyToRaisGoal, 
        address campaignManager
    ) external;

    function donate(uint256 campaignId) external payable;

    function withdrawFunds(uint256 campaignId) external;
}