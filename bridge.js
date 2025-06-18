// bridge.js
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const args = process.argv.slice(2);
const direction = args[0]; // helios-to-sepolia or sepolia-to-helios

const config = {
  "helios-to-sepolia": {
    rpc: process.env.HELIOS_RPC,
    token: process.env.HLS_CA_HELIOS,
    toChain: "Sepolia",
    decimals: 18,
    type: "direct"
  },
  "helios-to-bsc": {
    rpc: process.env.HELIOS_RPC,
    token: process.env.HLS_CA_HELIOS,
    toChain: "BSC",
    decimals: 18,
    type: "direct"
  },
  "helios-to-fuji": {
    rpc: process.env.HELIOS_RPC,
    token: process.env.HLS_CA_HELIOS,
    toChain: "Fuji",
    decimals: 18,
    type: "direct"
  },
  "helios-to-amoy": {
    rpc: process.env.HELIOS_RPC,
    token: process.env.HLS_CA_HELIOS,
    toChain: "Amoy",
    decimals: 18,
    type: "direct"
  },
  "sepolia-to-helios": {
    rpc: process.env.SEPOLIA_RPC,
    token: process.env.HLS_CA_SEPOLIA,
    vault: process.env.VAULT_CA_SEPOLIA,
    toChain: "Helios",
    decimals: 18,
    type: "vault"
  }
};

const settings = config[direction];
if (!settings?.rpc || !settings.token) {
  console.error("❌ Invalid direction. Use 'helios-to-sepolia' or 'sepolia-to-helios'");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(settings.rpc);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const recipient = process.env.RECEIVER;

const amount = ethers.parseUnits((Math.random() * 2 + 1).toFixed(2), settings.decimals);

const main = async () => {
  console.log(`🔗 Direction: ${direction}`);
  console.log(`🧾 Token Contract: ${settings.token}`);

  if (settings.type === "direct") {
    // Helios → Sepolia via bridgeToChain()
    const abi = [
      "function bridgeToChain(string toChain, string recipient, uint256 amount) external",
      "event BridgeToChain(address indexed from, string toChain, string recipient, uint256 amount)"
    ];
    const token = new ethers.Contract(settings.token, abi, wallet);

    console.log(`🔁 Bridging ${ethers.formatUnits(amount, settings.decimals)} tokens to ${settings.toChain}...`);
    const tx = await token.bridgeToChain(settings.toChain, recipient, amount);
    console.log(`⏳ TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Bridged! Block: ${receipt.blockNumber}`);

    const iface = new ethers.Interface(abi);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        console.log(`✅ Event ${parsed.name}:`);
        console.log(`   From     : ${parsed.args.from}`);
        console.log(`   To Chain : ${parsed.args.toChain}`);
        console.log(`   Recipient: ${parsed.args.recipient}`);
        console.log(`   Amount   : ${ethers.formatUnits(parsed.args.amount, settings.decimals)} tokens`);
      } catch {}
    }

  } else if (settings.type === "vault") {
    // Sepolia → Helios via sendToHelios()
    if (!settings.vault) {
      console.error("❌ VAULT_CA_SEPOLIA not set in .env");
      process.exit(1);
    }

    console.log(`🏦 Vault Contract: ${settings.vault}`);

    const token = new ethers.Contract(
      settings.token,
      ["function approve(address spender, uint256 amount) external returns (bool)"],
      wallet
    );

    const vault = new ethers.Contract(
      settings.vault,
      [
        "function sendToHelios(address token, uint256 amount, bytes calldata data) external",
        "event SendToHeliosEvent(address indexed _tokenContract, address indexed _sender, bytes32 _destination, uint256 _amount, uint256 _eventNonce, string _data)"
      ],
      wallet
    );


    console.log(`🔐 Approving ${ethers.formatUnits(amount, settings.decimals)} HLS to vault...`);
    const approveTx = await token.approve(settings.vault, amount);
    await approveTx.wait();
    console.log(`✅ Approved.`);

    console.log(`🚀 Sending to Helios...`);
    const tx = await vault.sendToHelios(settings.token, amount, "0x");
    console.log(`⏳ TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Sent! Block: ${receipt.blockNumber}`);

    const iface = new ethers.Interface(vault.interface.fragments);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === "SendToHeliosEvent") {
          console.log(`✅ Event ${parsed.name}:`);
          console.log(`   Token      : ${parsed.args._tokenContract}`);
          console.log(`   Sender     : ${parsed.args._sender}`);
          console.log(`   Amount     : ${ethers.formatUnits(parsed.args._amount, settings.decimals)} HLS`);
          console.log(`   Nonce      : ${parsed.args._eventNonce}`);
          console.log(`   Destination: ${parsed.args._destination}`);
        }
      } catch {}
    }
  }
};

main().catch(err => {
  console.error("❌ Error:", err.shortMessage || err.message || err);
});
