const hre = require('hardhat');

async function main() {
  const networkName = hre.network.name;
  console.log(`部署到网络: ${networkName}`);

  const HTPSnapshot = await hre.ethers.getContractFactory('HTPSnapshot');
  const contract = await HTPSnapshot.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`HTPSnapshot 已部署到: ${address}`);
  console.log(`链 ID: ${(await hre.ethers.provider.getNetwork()).chainId}`);

  // 验证初始状态
  const total = await contract.totalRecords();
  console.log(`初始记录总数: ${total}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
