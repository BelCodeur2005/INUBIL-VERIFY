import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convertit un hash SHA-256 hex (64 chars) en bytes32 comme le ferait le backend */
function hexToBytes32(hex: string): string {
  return '0x' + hex.padStart(64, '0');
}

const HASH_PDF_1     = hexToBytes32('a1b2c3d4e5f6' + '0'.repeat(52));
const HASH_PDF_2     = hexToBytes32('deadbeef1234' + '0'.repeat(52));
const UNIVERSITE_ID  = '3f4a1b2c-0000-0000-0000-000000000001';
const NUMERO_1       = 'ISTAMA-2024-0001';
const NUMERO_2       = 'ISTAMA-2024-0002';

// ── Fixture ───────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, autreCompte, inconnu] = await ethers.getSigners();

  const InubilVerify = await ethers.getContractFactory('InubilVerify');
  const contrat = await InubilVerify.deploy();

  return { contrat, owner, autreCompte, inconnu };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InubilVerify', () => {

  // ── Déploiement ─────────────────────────────────────────────────────────────

  describe('Déploiement', () => {
    it('définit le déployeur comme owner', async () => {
      const { contrat, owner } = await loadFixture(deployFixture);
      expect(await contrat.owner()).to.equal(owner.address);
    });
  });

  // ── enregistrerDiplome ───────────────────────────────────────────────────────

  describe('enregistrerDiplome', () => {
    it('enregistre un diplôme et émet un événement', async () => {
      const { contrat } = await loadFixture(deployFixture);

      await expect(
        contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID)
      )
        .to.emit(contrat, 'DiplomeEnregistre')
        .withArgs(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID, (ts: bigint) => ts > 0n);
    });

    it('le diplôme est bien lisible après enregistrement', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);

      const [existe, revoque, hashPdf, universiteId] =
        await contrat.verifierDiplome(NUMERO_1);

      expect(existe).to.be.true;
      expect(revoque).to.be.false;
      expect(hashPdf).to.equal(HASH_PDF_1);
      expect(universiteId).to.equal(UNIVERSITE_ID);
    });

    it('refuse si le numéro est vide', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await expect(
        contrat.enregistrerDiplome('', HASH_PDF_1, UNIVERSITE_ID)
      ).to.be.revertedWith('InubilVerify: numero vide');
    });

    it('refuse si le hash est vide (bytes32 zero)', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await expect(
        contrat.enregistrerDiplome(NUMERO_1, ethers.ZeroHash, UNIVERSITE_ID)
      ).to.be.revertedWith('InubilVerify: hash vide');
    });

    it('refuse si universiteId est vide', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await expect(
        contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, '')
      ).to.be.revertedWith('InubilVerify: universiteId vide');
    });

    it('refuse un double enregistrement du même numéro', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);

      await expect(
        contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_2, UNIVERSITE_ID)
      ).to.be.revertedWith('InubilVerify: diplome deja enregistre');
    });

    it('refuse si appelé par un non-owner', async () => {
      const { contrat, autreCompte } = await loadFixture(deployFixture);
      await expect(
        contrat.connect(autreCompte).enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID)
      ).to.be.revertedWith('InubilVerify: non autorise');
    });

    it('peut enregistrer deux diplômes différents', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);
      await contrat.enregistrerDiplome(NUMERO_2, HASH_PDF_2, UNIVERSITE_ID);

      const [existe1] = await contrat.verifierDiplome(NUMERO_1);
      const [existe2] = await contrat.verifierDiplome(NUMERO_2);
      expect(existe1).to.be.true;
      expect(existe2).to.be.true;
    });
  });

  // ── revoquerDiplome ──────────────────────────────────────────────────────────

  describe('revoquerDiplome', () => {
    it('révoque un diplôme existant et émet un événement', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);

      await expect(contrat.revoquerDiplome(NUMERO_1))
        .to.emit(contrat, 'DiplomeRevoque')
        .withArgs(NUMERO_1, (ts: bigint) => ts > 0n);
    });

    it('le diplôme est marqué révoqué après revocation', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);
      await contrat.revoquerDiplome(NUMERO_1);

      const [existe, revoque] = await contrat.verifierDiplome(NUMERO_1);
      expect(existe).to.be.true;   // toujours présent
      expect(revoque).to.be.true;  // mais marqué révoqué
    });

    it('refuse de révoquer un diplôme inexistant', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await expect(
        contrat.revoquerDiplome('NUMERO-INEXISTANT')
      ).to.be.revertedWith('InubilVerify: diplome introuvable');
    });

    it('refuse de révoquer deux fois le même diplôme', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);
      await contrat.revoquerDiplome(NUMERO_1);

      await expect(
        contrat.revoquerDiplome(NUMERO_1)
      ).to.be.revertedWith('InubilVerify: diplome deja revoque');
    });

    it('refuse si appelé par un non-owner', async () => {
      const { contrat, autreCompte } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);

      await expect(
        contrat.connect(autreCompte).revoquerDiplome(NUMERO_1)
      ).to.be.revertedWith('InubilVerify: non autorise');
    });
  });

  // ── verifierDiplome ──────────────────────────────────────────────────────────

  describe('verifierDiplome', () => {
    it('retourne existe=false pour un diplôme inconnu', async () => {
      const { contrat } = await loadFixture(deployFixture);
      const [existe] = await contrat.verifierDiplome('INCONNU-9999');
      expect(existe).to.be.false;
    });

    it('retourne les bonnes données pour un diplôme actif', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);

      const [existe, revoque, hashPdf, universiteId, dateEmission] =
        await contrat.verifierDiplome(NUMERO_1);

      expect(existe).to.be.true;
      expect(revoque).to.be.false;
      expect(hashPdf).to.equal(HASH_PDF_1);
      expect(universiteId).to.equal(UNIVERSITE_ID);
      expect(dateEmission).to.be.greaterThan(0n);
    });

    it('peut être appelée par n\'importe qui (pas de restriction)', async () => {
      const { contrat, inconnu } = await loadFixture(deployFixture);
      await contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID);

      // inconnu = compte sans aucun rôle
      const [existe] = await contrat.connect(inconnu).verifierDiplome(NUMERO_1);
      expect(existe).to.be.true;
    });
  });

  // ── transfererOwnership ──────────────────────────────────────────────────────

  describe('transfererOwnership', () => {
    it('transfère la propriété au nouvel owner', async () => {
      const { contrat, autreCompte } = await loadFixture(deployFixture);
      await contrat.transfererOwnership(autreCompte.address);
      expect(await contrat.owner()).to.equal(autreCompte.address);
    });

    it('le nouvel owner peut enregistrer un diplôme', async () => {
      const { contrat, autreCompte } = await loadFixture(deployFixture);
      await contrat.transfererOwnership(autreCompte.address);

      await expect(
        contrat.connect(autreCompte).enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID)
      ).to.not.be.reverted;
    });

    it('l\'ancien owner perd ses droits après transfert', async () => {
      const { contrat, autreCompte } = await loadFixture(deployFixture);
      await contrat.transfererOwnership(autreCompte.address);

      await expect(
        contrat.enregistrerDiplome(NUMERO_1, HASH_PDF_1, UNIVERSITE_ID)
      ).to.be.revertedWith('InubilVerify: non autorise');
    });

    it('refuse l\'adresse zéro', async () => {
      const { contrat } = await loadFixture(deployFixture);
      await expect(
        contrat.transfererOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith('InubilVerify: adresse zero');
    });

    it('refuse si appelé par un non-owner', async () => {
      const { contrat, autreCompte, inconnu } = await loadFixture(deployFixture);
      await expect(
        contrat.connect(inconnu).transfererOwnership(autreCompte.address)
      ).to.be.revertedWith('InubilVerify: non autorise');
    });
  });
});
