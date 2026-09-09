import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:inubil_verify_mobile/main.dart';

void main() {
  // BootstrapScreen lit le stockage securise au demarrage (TokenStorage) —
  // aucun canal de plateforme reel n'existe sous `flutter test`, on simule
  // "aucun jeton stocke" pour que le bootstrap se resolve en LoginScreen.
  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async => null,
    );
  });

  testWidgets("L'app demarre sur l'ecran de connexion", (WidgetTester tester) async {
    await tester.pumpWidget(const InubilVerifyApp());
    await tester.pumpAndSettle();

    expect(find.text('Connexion'), findsWidgets);
    expect(find.text('Se connecter'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
