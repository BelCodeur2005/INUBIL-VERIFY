import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Echelle typographique reprise de maquette/Bien_organise/DESIGN.md (Inter,
/// variante "headline-lg-mobile" deja prevue pour mobile) — contrairement aux
/// couleurs, cette echelle n'a jamais ete implementee cote web (qui utilise ses
/// propres tailles au cas par cas), donc pas de decalage a corriger ici : c'est
/// la premiere fois qu'elle sert vraiment.
class AppTypography {
  AppTypography._();

  static TextStyle headlineLgMobile = GoogleFonts.inter(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    height: 32 / 24,
    letterSpacing: -0.24,
    color: AppColors.textPrimary,
  );

  static TextStyle headlineMd = GoogleFonts.inter(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    height: 32 / 24,
    letterSpacing: -0.24,
    color: AppColors.textPrimary,
  );

  static TextStyle headlineSm = GoogleFonts.inter(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 28 / 20,
    color: AppColors.textPrimary,
  );

  static TextStyle bodyLg = GoogleFonts.inter(
    fontSize: 18,
    fontWeight: FontWeight.w400,
    height: 28 / 18,
    color: AppColors.textPrimary,
  );

  static TextStyle bodyMd = GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 24 / 16,
    color: AppColors.textPrimary,
  );

  static TextStyle bodySm = GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 20 / 14,
    color: AppColors.textSecondary,
  );

  /// Metadonnees (dates, references) — tracking large, comme les labels
  /// "DATE ISSUED" / "BLOCKCHAIN HASH" du DESIGN.md.
  static TextStyle labelMd = GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    height: 16 / 12,
    letterSpacing: 0.6,
    color: AppColors.textSecondary,
  );

  /// Hash, numeros de reference — police monospace pour la distinction des
  /// caracteres (0/O, 1/l), reprend le meme choix que le web (JetBrains Mono).
  static TextStyle codeMd = GoogleFonts.jetBrainsMono(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 20 / 14,
    color: AppColors.textPrimary,
  );
}
