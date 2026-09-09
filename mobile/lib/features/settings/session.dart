import 'package:flutter/material.dart';

/// Represente une session active. Champs alignes sur GET /auth/sessions
/// (auth.api.js / prisma sessions) : ip_address, user_agent, created_at —
/// pas de champ "appareil" ni "session actuelle" en base, donc le libelle et
/// l'icone d'appareil sont deduits du user_agent brut cote presentation.
class SessionActive {
  const SessionActive({
    required this.id,
    required this.userAgent,
    required this.ipAddress,
    required this.dateCreation,
  });

  final String id;
  final String? userAgent;
  final String? ipAddress;
  final DateTime dateCreation;

  String get appareil {
    final ua = userAgent ?? '';
    if (ua.contains('iPhone')) return 'iPhone';
    if (ua.contains('iPad')) return 'iPad';
    if (ua.contains('Android') && ua.contains('Mobile')) return 'Téléphone Android';
    if (ua.contains('Android')) return 'Tablette Android';
    if (ua.contains('Windows')) return 'PC Windows';
    if (ua.contains('Macintosh')) return 'Mac';
    if (ua.contains('Linux')) return 'PC Linux';
    return 'Appareil inconnu';
  }

  String get navigateur {
    final ua = userAgent ?? '';
    if (ua.contains('Edg/')) return 'Edge';
    if (ua.contains('Chrome/')) return 'Chrome';
    if (ua.contains('Firefox/')) return 'Firefox';
    if (ua.contains('Safari/')) return 'Safari';
    return 'Navigateur inconnu';
  }

  IconData get icone {
    final ua = userAgent ?? '';
    if (ua.contains('iPhone') || (ua.contains('Android') && ua.contains('Mobile'))) {
      return Icons.smartphone_rounded;
    }
    if (ua.contains('iPad') || (ua.contains('Android') && !ua.contains('Mobile'))) {
      return Icons.tablet_mac_rounded;
    }
    if (ua.contains('Windows') || ua.contains('Macintosh') || ua.contains('Linux')) {
      return Icons.computer_rounded;
    }
    return Icons.devices_other_rounded;
  }

  String get dateFormatee {
    const mois = [
      'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
    ];
    final h = dateCreation.hour.toString().padLeft(2, '0');
    final m = dateCreation.minute.toString().padLeft(2, '0');
    return '${dateCreation.day} ${mois[dateCreation.month - 1]} ${dateCreation.year} · $h:$m';
  }

  factory SessionActive.depuisJson(Map<String, dynamic> json) {
    return SessionActive(
      id: json['id'] as String,
      userAgent: json['user_agent'] as String?,
      ipAddress: json['ip_address'] as String?,
      dateCreation: DateTime.parse(json['created_at'] as String),
    );
  }
}
