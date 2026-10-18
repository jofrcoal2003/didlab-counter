
import "dotenv/config";
import fs from "node:fs";
import solc from "solc";
import { ethers } from "ethers";

// Read the Solidity contract.
const source = fs.readFileSync("./contracts/Counter.sol", "utf8");

// Configure the Solidity compiler.
const input = {
  language: "Solidity",
  sources: {
    "Counter.sol": { content: source }
  },
  settings: {
    evmVersion: "paris",
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

// Compile the contract.
const output = JSON.parse(solc.compile(JSON.stringify(input)));

const errors = (output.errors ?? []).filter(
  (error) => error.severity === "error"
);

if (errors.length > 0) {
  console.error(errors.map((error) => error.formattedMessage).join("\n"));
  process.exit(1);
}

// Extract the ABI and bytecode.
const compiled = output.contracts["Counter.sol"].Counter;
const abi = compiled.abi;
const bytecode = "0x" + compiled.evm.bytecode.object;

// Load DIDLab connection settings from .env.
const rpcUrl = process.env.DIDLAB_RPC_URL;
const privateKey = process.env.DIDLAB_PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  throw new Error("Set DIDLAB_RPC_URL and DIDLAB_PRIVATE_KEY in .env");
}

// Connect to DIDLab.
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

const network = await provider.getNetwork();

if (network.chainId !== 252501n) {
  throw new Error(`Wrong network! Chain ID: ${network.chainId}`);
}

console.log("Connected to DIDLab.");
console.log("Deployer:", wallet.address);

// Deploy a fresh Counter contract.
const factory = new ethers.ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy();

console.log(
  "Deployment transaction:",
  contract.deploymentTransaction().hash
);

await contract.waitForDeployment();

const address = await contract.getAddress();

console.log("Contract deployed at:", address);
console.log("Initial count:", (await contract.getCount()).toString());
console.log("Counter V2 deployment complete.");
