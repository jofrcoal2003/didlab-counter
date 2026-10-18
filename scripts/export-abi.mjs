
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const contractPath = path.join(
  projectRoot,
  "contracts",
  "Counter.sol"
);

const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "Counter.sol": {
      content: source
    }
  },
  settings: {
    evmVersion: "paris",
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(
    (error) => error.severity === "error"
  );

  if (errors.length > 0) {
    console.error(errors.map((error) => error.formattedMessage).join("\n"));
    process.exit(1);
  }
}

const contractOutput = output.contracts?.["Counter.sol"]?.Counter;

if (!contractOutput) {
  throw new Error("Counter contract was not found in compiler output.");
}

const abiPath = path.join(
  projectRoot,
  "frontend",
  "public",
  "abi.js"
);

const abiContents =
  "// Generated from contracts/Counter.sol. Do not edit manually.\n" +
  `export const COUNTER_ABI = ${JSON.stringify(contractOutput.abi, null, 2)};\n`;

fs.writeFileSync(abiPath, abiContents, "utf8");

console.log("ABI exported to:", abiPath);
console.log("ABI entries:", contractOutput.abi.length);
