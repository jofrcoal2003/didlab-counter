
import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(
  process.env.DIDLAB_RPC_URL
);

const wallet = new ethers.Wallet(
  process.env.DIDLAB_PRIVATE_KEY,
  provider
);

const address = "0xf762F9Df00611718c35C82D4de7DA4dD8D002096";

const abi = [
  "function getCount() view returns (uint256)",
  "function increment()",
  "event CountChanged(uint256 newCount, address changedBy)"
];

const contract = new ethers.Contract(address, abi, wallet);

let count = await contract.getCount();
console.log("Starting count:", count.toString());

// Increase the count until it reaches 5.
while (count < 5n) {
  const tx = await contract.increment();
  await tx.wait();

  count = await contract.getCount();
  console.log("Count is now:", count.toString());
}

// Try to increment again. This should revert.
console.log("Attempting increment at count 5...");

try {
  const tx = await contract.increment();
  await tx.wait();
  console.log("Unexpected: increment succeeded.");
} catch (error) {
  console.log("Expected revert detected!");
  console.log(error.shortMessage ?? error.message);
}
