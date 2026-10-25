
import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);

const contract = new ethers.Contract(
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39",
  [
    "function anchor(bytes32,bytes32,string)",
    "function verify(bytes32)",
    "error NotAuthorized(bytes32)"
  ],
  provider
);

const outsider = ethers.Wallet.createRandom();
const recordId = ethers.id("unauthorized-test-001");
const digest = ethers.id("test-content");

console.log("Unauthorized wallet:", outsider.address);

for (const [name, method, args] of [
  ["Anchor", "anchor", [recordId, digest, "test-cid"]],
  ["Verify", "verify", [recordId]]
]) {
  try {
    await contract[method].staticCall(...args, {
      from: outsider.address
    });
    console.log(name + ": FAILED - allowed");
  } catch (error) {
    console.log(name + ": rejected");
    console.log("Reason:", error.revert?.name ?? error.shortMessage);
  }
}
