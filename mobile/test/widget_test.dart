import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:inubil_verify_mobile/main.dart';

void main() {
  testWidgets("L'app demarre sur l'ecran de connexion", (WidgetTester tester) async {
    await tester.pumpWidget(const InubilVerifyApp());

    expect(find.text('Connexion'), findsWidgets);
    expect(find.text('Se connecter'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
