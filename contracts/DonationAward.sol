// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract DonationAward is Ownable, ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private tokenIds;

    constructor() ERC721("DonationAwardContract", "DWNFT") {}

    event NFTMinted(address donator, uint256 tokenId);

    /// @notice Function for minting NFT
    /// @dev This function emits NFTMinted event
    /// @param recipient Donator address
    /// @param tokenURI NFT uri
    function awardNft(address recipient, string memory tokenURI)
        external
        returns (uint256)
    {
        tokenIds.increment();

        uint256 tokenId = tokenIds.current();
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit NFTMinted(recipient, tokenId);
        return tokenId;
    }
}
