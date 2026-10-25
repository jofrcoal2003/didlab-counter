
import { ethers } from "ethers";
import "dotenv/config";

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);

const registry = new ethers.Contract(
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39",
  [
    "event RecordAnchored(bytes32 indexed recordId, bytes32 indexed digest, address indexed submitter, string cid)"
  ],
  provider
);

const recordId =
  "0x39575ec6660ae465c1419d25c5b461b4eee759097294d5cfbaed884d88044231";

const latest = await provider.getBlockNumber();
const chunkSize = 500;

console.log("Searching for original anchor transaction...");

let found = false;

for (let end = latest; end >= 0; end -= chunkSize) {
  const start = Math.max(0, end - chunkSize + 1);

  const logs = await registry.queryFilter(
    registry.filters.RecordAnchored(recordId),
    start,
    end
  );

  for (const log of logs) {
    const receipt = await log.getTransactionReceipt();

    console.log("Transaction hash:", log.transactionHash);
    console.log("Block:", log.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    found = true;
  }

  if (found) break;
}

if (!found) {
  console.log("No matching anchor transaction found.");
}
