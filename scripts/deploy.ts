import hre from 'hardhat'
import '@nomiclabs/hardhat-ethers'

async function main() {

  const [deployer] = await hre.ethers.getSigners();
  const nfta_contract = await hre.ethers.getContractFactory("NFTA");
  const nfta_instance = await nfta_contract.deploy();

  await nfta_instance.deployed();

  console.log("NFTA deployed to:", nfta_instance.address);
}

main()
  .then(()=>process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
