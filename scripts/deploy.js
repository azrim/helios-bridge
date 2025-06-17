const hre = require("hardhat");

async function main() {
  const BridgeVault = await hre.ethers.getContractFactory("BridgeVault");
  const vault = await BridgeVault.deploy();
  await vault.waitForDeployment();
  console.log(`✅ BridgeVault deployed at ${vault.target}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
