import { ethers, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('═══════════════════════════════════════════════════');
  console.log('  INUBIL Verify — Déploiement du contrat');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Réseau        : ${network.name}`);
  console.log(`  Déployeur     : ${deployer.address}`);

  const solde = await ethers.provider.getBalance(deployer.address);
  console.log(`  Solde MATIC   : ${ethers.formatEther(solde)} MATIC`);
  console.log('───────────────────────────────────────────────────');

  if (solde === 0n) {
    throw new Error(
      'Solde MATIC insuffisant. Alimentez le compte déployeur avant de continuer.',
    );
  }

  console.log('  Déploiement en cours...');
  const InubilVerify = await ethers.getContractFactory('InubilVerify');
  const contrat = await InubilVerify.deploy();
  await contrat.waitForDeployment();

  const adresse = await contrat.getAddress();
  const tx = contrat.deploymentTransaction();

  console.log('───────────────────────────────────────────────────');
  console.log(`  ✔  Contrat déployé !`);
  console.log(`  Adresse contrat : ${adresse}`);
  console.log(`  Hash tx         : ${tx?.hash ?? 'n/a'}`);
  console.log('───────────────────────────────────────────────────');
  console.log('');
  console.log('  Ajoutez cette ligne dans votre .env backend :');
  console.log(`  CONTRACT_ADDRESS=${adresse}`);
  console.log('');

  // Vérification rapide : le owner doit être le déployeur
  const owner = await contrat.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error('ERREUR : le owner du contrat ne correspond pas au déployeur.');
  }
  console.log(`  ✔  Owner vérifié : ${owner}`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
