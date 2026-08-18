import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// ABI minimaliste : uniquement les fonctions utilisées par le backend
const INUBIL_VERIFY_ABI = [
  'function enregistrerDiplome(string calldata numeroUnique, bytes32 hashPdf, string calldata universiteId) external',
  'function revoquerDiplome(string calldata numeroUnique) external',
  'function verifierDiplome(string calldata numeroUnique) external view returns (bool existe, bool revoque, bytes32 hashPdf, string universiteId, uint256 dateEmission)',
];

export interface VerifBlockchain {
  existe: boolean;
  revoque: boolean;
  hashPdf: string;       // bytes32 hex
  universiteId: string;
  dateEmission: Date | null;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  private readonly provider:    ethers.JsonRpcProvider | null = null;
  private readonly wallet:      ethers.Wallet | null           = null;
  private readonly contrat:     ethers.Contract | null         = null;
  private readonly contratLire: ethers.Contract | null         = null; // lecture seule

  constructor(private readonly config: ConfigService) {
    const rpcUrl          = config.get<string>('POLYGON_RPC_URL');
    const privateKey      = config.get<string>('DEPLOYER_PRIVATE_KEY');
    const contractAddress = config.get<string>('CONTRACT_ADDRESS');

    if (!rpcUrl || !privateKey || !contractAddress) {
      this.logger.warn(
        'Blockchain non configurée (POLYGON_RPC_URL / DEPLOYER_PRIVATE_KEY / CONTRACT_ADDRESS manquants). ' +
        'Les appels blockchain seront ignorés.',
      );
      return;
    }

    try {
      this.provider    = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet      = new ethers.Wallet(privateKey, this.provider);
      this.contrat     = new ethers.Contract(contractAddress, INUBIL_VERIFY_ABI, this.wallet);
      this.contratLire = new ethers.Contract(contractAddress, INUBIL_VERIFY_ABI, this.provider);
      this.logger.log(`Blockchain connectée - contrat : ${contractAddress}`);
    } catch (err) {
      this.logger.error('Erreur initialisation blockchain :', err);
    }
  }

  get estConfiguree(): boolean {
    return this.contrat !== null;
  }

  // ── Écriture ──────────────────────────────────────────────────────────────

  /**
   * Enregistre un diplôme sur la blockchain.
   * @param numeroUnique  Identifiant unique du diplôme (ex: "ISTAMA-2024-0001")
   * @param hashPdfHex    SHA-256 du PDF en hexadécimal (64 caractères)
   * @param universiteId  UUID de l'université
   * @returns Hash de la transaction, ou null si blockchain non configurée
   */
  async enregistrerDiplome(
    numeroUnique: string,
    hashPdfHex:   string,
    universiteId: string,
  ): Promise<{ txHash: string; blocNumero: bigint } | null> {
    if (!this.contrat) return null;

    try {
      const hashBytes32 = this.hexVersBytes32(hashPdfHex);
      const tx: ethers.TransactionResponse = await this.contrat['enregistrerDiplome'](
        numeroUnique,
        hashBytes32,
        universiteId,
      );
      const receipt = await tx.wait(); // attend la confirmation (1 bloc)
      const blocNumero = BigInt(receipt?.blockNumber ?? 0);
      this.logger.log(`Diplôme enregistré on-chain : ${numeroUnique} (tx: ${tx.hash}, bloc: ${blocNumero})`);
      return { txHash: tx.hash, blocNumero };
    } catch (err) {
      const raison = err instanceof Error ? err.message : String(err);
      if (raison.includes('deja enregistre')) {
        this.logger.warn(`Diplôme ${numeroUnique} déjà enregistré on-chain — ignoré.`);
      } else {
        this.logger.error(`Erreur enregistrerDiplome (${numeroUnique}) : ${raison}`);
      }
      return null;
    }
  }

  /**
   * Révoque un diplôme sur la blockchain.
   * @returns Hash de la transaction, ou null si blockchain non configurée
   */
  async revoquerDiplome(numeroUnique: string): Promise<string | null> {
    if (!this.contrat) return null;

    try {
      const tx: ethers.TransactionResponse = await this.contrat['revoquerDiplome'](numeroUnique);
      await tx.wait();
      this.logger.log(`Diplôme révoqué on-chain : ${numeroUnique} (tx: ${tx.hash})`);
      return tx.hash;
    } catch (err) {
      this.logger.error(`Erreur revoquerDiplome (${numeroUnique}) :`, err);
      return null;
    }
  }

  // ── Lecture (publique, gratuite) ──────────────────────────────────────────

  /**
   * Vérifie un diplôme sur la blockchain. Aucune clé privée requise.
   * @returns Données du diplôme, ou null si blockchain non configurée
   */
  async verifierDiplome(numeroUnique: string): Promise<VerifBlockchain | null> {
    if (!this.contratLire) return null;

    try {
      const [existe, revoque, hashPdf, universiteId, dateEmissionBn]: [
        boolean, boolean, string, string, bigint
      ] = await this.contratLire['verifierDiplome'](numeroUnique);

      return {
        existe,
        revoque,
        hashPdf,
        universiteId,
        dateEmission: dateEmissionBn > 0n
          ? new Date(Number(dateEmissionBn) * 1000)
          : null,
      };
    } catch (err) {
      this.logger.error(`Erreur verifierDiplome (${numeroUnique}) :`, err);
      return null;
    }
  }

  // ── Utilitaire ────────────────────────────────────────────────────────────

  /**
   * Convertit un hash SHA-256 hex (64 chars) en bytes32 pour le contrat.
   * ex: "a1b2c3..." → "0xa1b2c3...000..."
   */
  private hexVersBytes32(hex: string): string {
    const propre = hex.replace(/^0x/, '').padEnd(64, '0').slice(0, 64);
    return '0x' + propre;
  }
}
