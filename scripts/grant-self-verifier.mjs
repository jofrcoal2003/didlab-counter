import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);
const wallet = new ethers.Wallet(process.env.DIDLAB_PRIVATE_KEY, provider);

const contract = new ethers.Contract(
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39",
  [
    "function VERIFIER() view returns (bytes32)",
    "function grantRole(bytes32,address)",
    "function hasRole(bytes32,address) view returns (bool)"
  ],
  wallet
);

const role = await contract.VERIFIER();

const tx = await contract.grantRole(role, wallet.address);
console.log("Transaction:", tx.hash);
await tx.wait();

console.log("Account 1 has VERIFIER:", await contract.hasRole(role, wallet.address));
