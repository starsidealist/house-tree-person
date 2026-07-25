const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) { console.error('No private key'); process.exit(1); }

  const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz', 10143);
  const wallet = new ethers.Wallet(pk, provider);
  console.log('Deployer:', wallet.address);

  // Read compiled artifact
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'HTPSnapshot.sol', 'HTPSnapshot.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log('Deploying HTPSnapshot...');

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('HTPSnapshot deployed to:', address);
  console.log('TX hash:', contract.deploymentTransaction().hash);

  // Verify
  const total = await contract.totalRecords();
  console.log('Initial totalRecords:', total.toString());

  // Save address
  fs.writeFileSync(path.join(__dirname, '..', 'deployed-address.txt'), address);
  console.log('Address saved to deployed-address.txt');
}

main().catch(e => {
  console.error('Deploy failed:', e.message);
  process.exit(1);
});
