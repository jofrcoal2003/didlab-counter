
import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);
const wallet = new ethers.Wallet(process.env.DIDLAB_PRIVATE_KEY, provider);

const contract = new ethers.Contract(
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39",
  [
    "function VERIFIER() view returns (bytes32)",
    "function grantRole(bytes32 role, address account)",
    "function hasRole(bytes32 role, address account) view returns (bool)"
  ],
  wallet
);

const verifier = "0xD40963bf3d072203B607387339774c90730c1939";
const role = await contract.VERIFIER();

const tx = await contract.grantRole(role, verifier);
console.log("Transaction:", tx.hash);

await tx.wait();

console.log("VERIFIER granted:", await contract.hasRole(role, verifier));
