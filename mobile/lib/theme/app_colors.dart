import 'package:flutter/material.dart';

/// Palette reprise de l'application web reelle (inubil-verify-front), pas du
/// fichier de maquette maquette/Bien_organise/DESIGN.md qui decrit des teintes
/// (#0A4275...) jamais implementees en pratique. Valeurs verifiees par comptage
/// d'occurrences dans les CSS modules de l'espace etudiant web (DashboardEtudiant,
/// MesDiplomes, MesPartages...).
class AppColors {
  AppColors._();

  // Marque — degrade utilise sur la sidebar web (DashboardEtudiant.module.css).
  static const primary = Color(0xFF0350BD);
  static const primaryDark = Color(0xFF062362);

  // Texte
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textMuted = Color(0xFF94A3B8);

  // Surfaces
  static const background = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFE2E8F0);
  static const borderLight = Color(0xFFF1F5F9);

  // Statuts (memes teintes que les badges de statut de document cote web)
  static const success = Color(0xFF10B981);
  static const successDark = Color(0xFF047857);
  static const warning = Color(0xFFB45309);
  static const warningBg = Color(0xFFFFFBEB);
  static const error = Color(0xFFB91C1C);
  static const errorBg = Color(0xFFFEF2F2);
}
