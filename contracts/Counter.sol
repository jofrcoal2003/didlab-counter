
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Counter {
    uint256 private count;

    event CountChanged(uint256 newCount, address changedBy);

    function increment() external {
        count += 1;
        emit CountChanged(count, msg.sender);
    }

    function getCount() external view returns (uint256) {
        return count;
    }

    function decrement() external {
        require(count > 0, "Counter cannot go below zero");
        count -= 1;
        emit CountChanged(count, msg.sender);
    }
}
