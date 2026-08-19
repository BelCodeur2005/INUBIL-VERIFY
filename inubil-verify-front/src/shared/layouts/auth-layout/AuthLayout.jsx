import { Outlet } from 'react-router-dom';
import Logo_Inubil from '../../../assets/Logo_Inubil.png';

export default function AuthLayout() {
  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        width: '100vw', 
        background: 'linear-gradient(135deg, #0350bd 0%, #062362 100%)', 
        display: 'flex', 
        flexDirection: 'column', 
        margin: 0, 
        padding: 0 
      }}
    >
      
      {/* Navbar supérieure toujours affichée */}
      <nav style={{ backgroundColor: 'white', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', width: '100%', boxSizing: 'border-box' }}>
        <img 
          src={Logo_Inubil} 
          alt="INUBIL Verify Logo" 
          style={{ height: '80px', width: 'auto', objectFit: 'contain' }} 
        />
      </nav>
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', width: '100%', boxSizing: 'border-box' }}>
        <Outlet />
      </main>

    </div>
  );
}