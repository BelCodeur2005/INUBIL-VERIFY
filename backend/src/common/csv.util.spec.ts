import { toCsv } from './csv.util';

describe('toCsv', () => {
  it('inclut un BOM UTF-8 et les en-têtes', () => {
    const csv = toCsv(
      [{ nom: 'KAMGA' }],
      [{ header: 'Nom', value: (r) => r.nom }],
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Nom');
    expect(csv).toContain('KAMGA');
  });

  it('échappe les guillemets et le point-virgule', () => {
    const csv = toCsv(
      [{ v: 'Dupont; "Le Grand"' }],
      [{ header: 'Champ', value: (r) => r.v }],
    );
    expect(csv).toContain('"Dupont; ""Le Grand"""');
  });

  it('neutralise une valeur commençant par = (injection de formule)', () => {
    const csv = toCsv(
      [{ v: "=cmd|'/c calc'!A1" }],
      [{ header: 'Nom', value: (r) => r.v }],
    );
    expect(csv).not.toMatch(/;=|^=/m);
    expect(csv).toContain("'=cmd");
  });

  it.each(['+1234', '-1234', '@SUM(A1)', '\t=1+1'])(
    'neutralise aussi les préfixes %s',
    (valeurDangereuse) => {
      const csv = toCsv(
        [{ v: valeurDangereuse }],
        [{ header: 'Champ', value: (r) => r.v }],
      );
      const ligneDonnees = csv.split('\r\n')[1];
      expect(
        ligneDonnees.startsWith("'") || ligneDonnees.startsWith('"\''),
      ).toBe(true);
    },
  );

  it('laisse les valeurs normales intactes', () => {
    const csv = toCsv(
      [{ v: 'INUB-2026-0001' }],
      [{ header: 'Réf', value: (r) => r.v }],
    );
    expect(csv).toContain('INUB-2026-0001');
  });

  it('rend une chaîne vide pour null/undefined', () => {
    const csv = toCsv(
      [{ a: null, b: undefined }],
      [
        { header: 'A', value: (r) => r.a },
        { header: 'B', value: (r) => r.b },
      ],
    );
    const ligneDonnees = csv.split('\r\n')[1];
    expect(ligneDonnees).toBe(';');
  });
});
