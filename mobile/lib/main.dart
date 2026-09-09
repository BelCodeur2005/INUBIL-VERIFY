import 'package:flutter/material.dart';
import 'shared/widgets/bootstrap_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const InubilVerifyApp());
}

class InubilVerifyApp extends StatelessWidget {
  const InubilVerifyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'INUBIL Verify',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const BootstrapScreen(),
    );
  }
}
