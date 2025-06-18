// bridge.js
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const args = process.argv.slice(2);
const direction = args[0]; // helios-to-sepolia or sepolia-to-helios

const config = {
  "helios-to-sepolia": {
    rpc: process.env.HELIOS_RPC,
    contract: process.env.HLS_CA_HELIOS,
    toChain: "Sepolia",
    decimals: 18,
  },
  "sepolia-to-helios": { // currently not working
    rpc: process.env.SEPOLIA_RPC,
    contract: process.env.HLS_CA_SEPOLIA,
    toChain: "Helios",
    decimals: 18,
  }
};

const { rpc, contract, toChain, decimals } = config[direction];
if (!rpc || !contract) {
  console.error("❌ Invalid direction. Use helios-to-sepolia or sepolia-to-helios");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpc);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const recipient = process.env.RECEIVER;

// ABI: Simplified ERC20 + bridge
const abi = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function bridgeToChain(string toChain, string recipient, uint256 amount) external"
];

const main = async () => {
  console.log(`🔗 Direction: ${direction}`);
  console.log("Contract on current chain:", contract); // show CA
  const contractInstance = new ethers.Contract(contract, abi, wallet);

  const amount = ethers.parseUnits(
    (Math.random() * 2 + 1).toFixed(2), decimals
  );

  console.log(`🔁 Bridging ${ethers.formatUnits(amount, decimals)} tokens to ${toChain}...`);

  const tx = await contractInstance.bridgeToChain(toChain, recipient, amount);
  console.log(`⏳ TX sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Bridged! Block: ${receipt.blockNumber}`);
  console.log("📦 Raw Logs:", receipt.logs?.length);

  const iface = new ethers.Interface([
    "event BridgeToChain(address indexed from, string toChain, string recipient, uint256 amount)"
  ]);

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      console.log(`✅ Event ${parsed.name}:`);
      console.log(`   From     : ${parsed.args.from}`);
      console.log(`   To Chain : ${parsed.args.toChain}`);
      console.log(`   Recipient: ${parsed.args.recipient}`);
      console.log(`   Amount   : ${ethers.formatUnits(parsed.args.amount, decimals)} tokens`);
    } catch {}
  }

};

main().catch(console.error);
