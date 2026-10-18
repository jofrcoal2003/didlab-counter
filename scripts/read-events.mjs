
import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(
  process.env.DIDLAB_RPC_URL
);

const address = "0xf762F9Df00611718c35C82D4de7DA4dD8D002096";

const abi = [
  "event CountChanged(uint256 newCount, address changedBy)"
];

const contract = new ethers.Contract(address, abi, provider);

console.log("Searching for CountChanged events...");

const latestBlock = await provider.getBlockNumber();
const chunkSize = 1000;
const events = [];

for (let fromBlock = 0; fromBlock <= latestBlock; fromBlock += chunkSize) {
  const toBlock = Math.min(
    fromBlock + chunkSize - 1,
    latestBlock
  );

  console.log(`Searching blocks ${fromBlock} to ${toBlock}...`);

  const filter = contract.filters.CountChanged();
  const chunkEvents = await contract.queryFilter(
    filter,
    fromBlock,
    toBlock
  );

  events.push(...chunkEvents);
}

console.log(`\nFound ${events.length} events.`);

for (const event of events) {
  console.log("------------------------------");
  console.log("New count:", event.args.newCount.toString());
  console.log("Changed by:", event.args.changedBy);
  console.log("Block number:", event.blockNumber);
  console.log("Transaction hash:", event.transactionHash);
}
