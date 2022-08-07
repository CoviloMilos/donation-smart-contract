import { ethers } from "hardhat";

async function main() {
  const DonationAwardFactory = await ethers.getContractFactory("DonationAward");
  const donationAward = await DonationAwardFactory.deploy();

  await donationAward.deployed();

  console.log(`DonationAward contract deployed to: ${donationAward.address}`);

  const DonationFactory = await ethers.getContractFactory("Donation");
  const donation = await DonationFactory.deploy(donationAward.address);

  await donation.deployed();

  console.log(`Donation contract deployed to: ${donation.address}`);

  await donationAward.transferOwnership(donation.address);

  console.log(
    `DonationAward contract transfer ownership to: ${donation.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
