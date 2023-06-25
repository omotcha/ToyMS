import hre from 'hardhat'
import '@nomiclabs/hardhat-ethers'

async function main() {

  const [deployer] = await hre.ethers.getSigners();
  const nfta_contract = await hre.ethers.getContractFactory("NFTA");
  const multisig_contract = await hre.ethers.getContractFactory("Multisig721");
  const nfta_instance = await nfta_contract.deploy();
  const multisig_instance = await multisig_contract.deploy();

  await nfta_instance.deployed();
  console.log("NFTA deployed to:", nfta_instance.address);

  await multisig_instance.deployed();
  console.log("Multisig721 deployed to:", multisig_instance.address);
}

main()
  .then(()=>process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
