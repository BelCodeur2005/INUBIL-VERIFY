// Construit un tableau de dates ISO (YYYY-MM-DD) des N derniers jours (aujourd'hui inclus) —
// utilise pour parametrer GET /admin/statistiques/graphe avant de le passer a TendanceChart.
export function plageJours(nbJours) {
  const jours = [];
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  for (let i = nbJours - 1; i >= 0; i--) {
    const d = new Date(aujourdhui);
    d.setDate(d.getDate() - i);
    jours.push(d.toISOString().slice(0, 10));
  }
  return jours;
}
