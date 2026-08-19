export default function Support_Agent() {
  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>
        Centre d'Assistance & Support Technique
      </h2>

      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, fontSize: '18px' }}>Besoin d'aide sur le nœud Blockchain ?</h3>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
          Consultez la documentation ou contactez directement l'équipe technique pour tout problème lié à l'ancrage ou aux révocations de diplômes.
        </p>
        
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Bouton vers la documentation */}
          <a 
            href="https://docs.inubil-verify.org" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              background: 'linear-gradient(135deg, #0350bd 0%, #062362 100%)', 
              color: 'white', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              textDecoration: 'none', 
              fontSize: '14px', 
              fontWeight: '500',
              border: '1px solid #cbd5e1'
            }}
          >
            Consulter la documentation
          </a>

          {/* Bouton pour contacter le support */}
          <a 
            href="mailto:belviengangue055@gmail.org" 
            style={{ 
              backgroundColor: '#2563eb', 
              color: '#fff', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              textDecoration: 'none', 
              fontSize: '14px', 
              fontWeight: '500' 
            }}
          >
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  );
}