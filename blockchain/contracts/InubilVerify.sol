// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  InubilVerify
 * @notice Certifie et vérifie l'authenticité des diplômes INUBIL sur Polygon.
 *
 * Chaque diplôme est identifié par son numéro unique (string).
 * Le contrat stocke le hash SHA-256 du PDF ainsi que les métadonnées
 * nécessaires à la vérification publique.
 *
 * Seul le propriétaire du contrat (le backend INUBIL) peut enregistrer
 * ou révoquer un diplôme. La vérification est publique et gratuite.
 */
contract InubilVerify {

    // ── Propriétaire ──────────────────────────────────────────────────────────

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "InubilVerify: non autorise");
        _;
    }

    // ── Structures de données ─────────────────────────────────────────────────

    struct Diplome {
        bytes32 hashPdf;       // SHA-256 du fichier PDF (hex → bytes32)
        string  universiteId;  // UUID de l'université émettrice
        uint256 dateEmission;  // timestamp UNIX d'enregistrement on-chain
        bool    existe;        // true dès que le diplôme a été enregistré
        bool    revoque;       // true si le diplôme a été révoqué
    }

    // numeroUnique → Diplome
    mapping(string => Diplome) private _diplomes;

    // ── Événements ────────────────────────────────────────────────────────────

    event DiplomeEnregistre(
        string  indexed numeroUnique,
        bytes32         hashPdf,
        string          universiteId,
        uint256         dateEmission
    );

    event DiplomeRevoque(
        string  indexed numeroUnique,
        uint256         dateRevocation
    );

    // ── Constructeur ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Fonctions d'écriture (onlyOwner) ──────────────────────────────────────

    /**
     * @notice Enregistre un diplôme sur la blockchain.
     * @param  numeroUnique  Identifiant unique du diplôme (ex: "ISTAMA-2024-0001")
     * @param  hashPdf       SHA-256 du PDF encodé en bytes32
     * @param  universiteId  UUID de l'université émettrice
     */
    function enregistrerDiplome(
        string  calldata numeroUnique,
        bytes32          hashPdf,
        string  calldata universiteId
    ) external onlyOwner {
        require(bytes(numeroUnique).length > 0,   "InubilVerify: numero vide");
        require(hashPdf != bytes32(0),             "InubilVerify: hash vide");
        require(bytes(universiteId).length > 0,   "InubilVerify: universiteId vide");
        require(!_diplomes[numeroUnique].existe,   "InubilVerify: diplome deja enregistre");

        _diplomes[numeroUnique] = Diplome({
            hashPdf:      hashPdf,
            universiteId: universiteId,
            dateEmission: block.timestamp,
            existe:       true,
            revoque:      false
        });

        emit DiplomeEnregistre(numeroUnique, hashPdf, universiteId, block.timestamp);
    }

    /**
     * @notice Révoque un diplôme (ne supprime pas les données, marque comme révoqué).
     * @param  numeroUnique  Identifiant unique du diplôme à révoquer
     */
    function revoquerDiplome(string calldata numeroUnique) external onlyOwner {
        require(_diplomes[numeroUnique].existe,   "InubilVerify: diplome introuvable");
        require(!_diplomes[numeroUnique].revoque, "InubilVerify: diplome deja revoque");

        _diplomes[numeroUnique].revoque = true;

        emit DiplomeRevoque(numeroUnique, block.timestamp);
    }

    // ── Fonction de lecture (publique, gratuite) ───────────────────────────────

    /**
     * @notice Vérifie un diplôme. Accessible par n'importe qui sans frais.
     * @param  numeroUnique  Identifiant unique du diplôme
     * @return existe        true si le diplôme a été enregistré
     * @return revoque       true si le diplôme a été révoqué
     * @return hashPdf       SHA-256 du PDF d'origine
     * @return universiteId  UUID de l'université émettrice
     * @return dateEmission  Timestamp UNIX d'enregistrement
     */
    function verifierDiplome(string calldata numeroUnique)
        external
        view
        returns (
            bool    existe,
            bool    revoque,
            bytes32 hashPdf,
            string  memory universiteId,
            uint256 dateEmission
        )
    {
        Diplome storage d = _diplomes[numeroUnique];
        return (d.existe, d.revoque, d.hashPdf, d.universiteId, d.dateEmission);
    }

    // ── Administration ────────────────────────────────────────────────────────

    /**
     * @notice Transfère la propriété du contrat (ex: rotation de clé backend).
     * @param  nouvelOwner  Adresse du nouveau propriétaire
     */
    function transfererOwnership(address nouvelOwner) external onlyOwner {
        require(nouvelOwner != address(0), "InubilVerify: adresse zero");
        owner = nouvelOwner;
    }
}
