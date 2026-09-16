import { useState, useEffect } from 'react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { 
  ShieldCheck, 
  Search, 
  UserPlus, 
  Users, 
  History, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Car,
  Camera,
  AlertCircle,
  Wand2,
  FileText,
  Home,
  Menu,
  PlusCircle,
  User
} from 'lucide-react';

const API_URL = "https://kincheck-api.onrender.com";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'scan', 'menu', 'history'

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginErreur, setLoginErreur] = useState('');

  const [plaque, setPlaque] = useState('');
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');

  const [nouveauVehicule, setNouveauVehicule] = useState({
    plaque: '', marque: '', couleur: '', proprietaire: '', est_en_regle: true
  });
  const [vehiculeMsg, setVehiculeMsg] = useState('');

  const [nouvelAgent, setNouvelAgent] = useState({ 
    username: '', password: '', nom_complet: '', role: 'agent_terrain' 
  });
  const [agentMsg, setAgentMsg] = useState('');
  const [listeUsers, setListeUsers] = useState([]);
  const [listeHistorique, setListeHistorique] = useState([]);

  // Sous-vues dans le Menu
  const [menuView, setMenuView] = useState('main'); // 'main', 'create_agent', 'users_list'

  const genererMotDePasse = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%!";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    setNouvelAgent(prev => ({ ...prev, password: pwd }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErreur('');
    try {
      const reponse = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username.trim(),
          password: loginForm.password.trim()
        })
      });

      if (!reponse.ok) {
        const errData = await reponse.json();
        throw new Error(errData.detail || "Identifiants incorrects.");
      }
      const data = await reponse.json();
      setUser({ token: data.access_token, role: data.role, username: loginForm.username });
      setActiveTab('home');
    } catch (err) {
      setLoginErreur(err.message);
    }
  };

  const chargerDonneesAdmin = async () => {
    try {
      const resUsers = await fetch(`${API_URL}/api/v1/users/`);
      if (resUsers.ok) setListeUsers(await resUsers.json());

      const resHist = await fetch(`${API_URL}/api/v1/historique/`);
      if (resHist.ok) setListeHistorique(await resHist.json());
    } catch (err) {
      console.error("Erreur chargement admin", err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      chargerDonneesAdmin();
    }
  }, [user]);

  const rechercherVehicule = async (e) => {
    e.preventDefault();
    setErreur('');
    setResultat(null);
    const plaqueClean = plaque.trim();
    if (!plaqueClean) return;

    try {
      const reponse = await fetch(`${API_URL}/api/v1/vehicules/${encodeURIComponent(plaqueClean)}?agent_username=${user.username}`);
      if (!reponse.ok) throw new Error("Plaque introuvable ou véhicule non enregistré.");
      setResultat(await reponse.json());
    } catch (err) {
      setErreur(err.message);
    } finally {
      if (user && user.role === 'super_admin') chargerDonneesAdmin();
    }
  };

  const prendrePhotoIA = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('file', blob, "plaque.jpg");

      setErreur('');
      const res = await fetch(`${API_URL}/api/v1/ia/analyser-plaque`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Erreur analyse IA.");
      const data = await res.json();
      if (data.plaque) {
        setPlaque(data.plaque.toUpperCase().replace(/\s+/g, ''));
      } else {
        setErreur("Aucune plaque lisible détectée.");
      }
    } catch (err) {
      setErreur("Echec de la prise de photo.");
    }
  };

  const enregistrerVehicule = async (e) => {
    e.preventDefault();
    setVehiculeMsg('');
    try {
      const reponse = await fetch(`${API_URL}/api/v1/vehicules/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nouveauVehicule)
      });
      if (!reponse.ok) throw new Error("Erreur d'enregistrement.");

      setVehiculeMsg(`✅ Véhicule ${nouveauVehicule.plaque} enregistré !`);
      setNouveauVehicule({ plaque: '', marque: '', couleur: '', proprietaire: '', est_en_regle: true });
    } catch (err) {
      setVehiculeMsg(`❌ ${err.message}`);
    }
  };

  const creerAgent = async (e) => {
    e.preventDefault();
    setAgentMsg('');
    if (!nouvelAgent.password) return setAgentMsg("❌ Veuillez générer un mot de passe.");
    try {
      const reponse = await fetch(`${API_URL}/api/v1/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: nouvelAgent.username,
          password: nouvelAgent.password,
          nom_complet: nouvelAgent.nom_complet,
          role: nouvelAgent.role
        })
      });
      if (!reponse.ok) throw new Error("Erreur lors de la création.");

      setAgentMsg(`✅ Agent créé ! Mot de passe : ${nouvelAgent.password}`);
      setNouvelAgent({ username: '', password: '', nom_complet: '', role: 'agent_terrain' });
      chargerDonneesAdmin();
    } catch (err) {
      setAgentMsg(`❌ ${err.message}`);
    }
  };

  const supprimerAgent = async (id, username) => {
    if (username === 'admin@kincheck.cd') return;
    if (window.confirm(`Supprimer ${username} ?`)) {
      await fetch(`${API_URL}/api/v1/users/${id}`, { method: 'DELETE' });
      chargerDonneesAdmin();
    }
  };

  const styles = {
    appBg: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1329 0%, #101d3b 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column'
    },
    centerScreen: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      background: 'rgba(23, 37, 72, 0.75)',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(11, 19, 41, 0.9)',
      color: '#fff',
      fontSize: '16px',
      boxSizing: 'border-box',
      marginBottom: '14px'
    },
    buttonPrimary: {
      width: '100%',
      padding: '14px',
      borderRadius: '12px',
      border: 'none',
      background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
      color: '#fff',
      fontWeight: '700',
      fontSize: '16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    bottomBar: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '65px',
      background: '#0b1329',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000
    },
    navItem: (active) => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      color: active ? '#3b82f6' : '#94a3b8',
      fontSize: '12px',
      fontWeight: active ? '700' : '500',
      background: 'none',
      border: 'none',
      cursor: 'pointer'
    })
  };

  // --- 1. FENÊTRE DE CONNEXION (CENTRÉE VERTICALEMENT) ---
  if (!user) {
    return (
      <div style={styles.appBg}>
        <div style={styles.centerScreen}>
          <div style={styles.card}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.2)', color: '#3b82f6', marginBottom: '12px' }}>
                <ShieldCheck size={48} />
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0 }}>Kin-Check</h1>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>APDNK Security Portal</p>
            </div>

            <form onSubmit={handleLogin}>
              <input 
                type="text" 
                required
                placeholder="Identifiant / Email"
                style={styles.input}
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
              <input 
                type="password" 
                required
                placeholder="Mot de passe"
                style={styles.input}
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
              <button type="submit" style={styles.buttonPrimary}>
                Se connecter
              </button>
            </form>

            {loginErreur && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171', fontSize: '14px', textAlign: 'center' }}>
                <AlertCircle size={16} inline /> {loginErreur}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP WITH NAVIGATION BAR ---
  return (
    <div style={styles.appBg}>
      
      {/* HEADER DU HAUT (COMMUN À TOUTES LES PAGES) */}
      <div style={{ padding: '16px', background: '#0b1329', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={28} color="#3b82f6" />
          <span style={{ fontSize: '20px', fontWeight: '800' }}>Kin-Check</span>
        </div>
        <button 
          onClick={() => setUser(null)}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
        >
          <LogOut size={22} />
        </button>
      </div>

      {/* CONTENU VARIABLE SELON L'ONGLET SÉLECTIONNÉ */}
      <div style={{ flex: 1, padding: '16px', paddingBottom: '80px', overflowY: 'auto' }}>
        
        {/* II. FENÊTRE ACCUEIL / TABLEAU DE BORD */}
        {activeTab === 'home' && (
          <div>
            <div style={{ ...styles.card, maxWidth: '100%', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <User size={32} color="#60a5fa" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Session Active</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>{user.username} ({user.role})</p>
                </div>
              </div>
            </div>

            <div style={{ ...styles.card, maxWidth: '100%' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#60a5fa' }}>Raccourcis Rapides</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => setActiveTab('scan')} style={{ ...styles.buttonPrimary, fontSize: '14px', padding: '12px' }}>
                  <Search size={18} /> Contrôle
                </button>
                <button onClick={() => setActiveTab('menu')} style={{ ...styles.buttonPrimary, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '14px', padding: '12px' }}>
                  <Menu size={18} /> Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FENÊTRE CONTRÔLE / SCANNER */}
        {activeTab === 'scan' && (
          <div style={{ ...styles.card, maxWidth: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#60a5fa' }}>Contrôle de Plaque</h3>
            <form onSubmit={rechercherVehicule}>
              <input 
                type="text" 
                placeholder="Numéro de Plaque (1234AB01)"
                value={plaque}
                onChange={(e) => setPlaque(e.target.value)}
                style={styles.input}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={prendrePhotoIA} style={{ ...styles.buttonPrimary, background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', flex: 1 }}>
                  <Camera size={20} /> Photo IA
                </button>
                <button type="submit" style={{ ...styles.buttonPrimary, flex: 1 }}>
                  <Car size={20} /> Vérifier
                </button>
              </div>
            </form>

            {resultat && (
              <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: resultat.est_en_regle ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', border: `1px solid ${resultat.est_en_regle ? '#22c55e' : '#ef4444'}` }}>
                <h2 style={{ margin: '0 0 8px 0' }}>{resultat.plaque}</h2>
                <p style={{ margin: '4px 0' }}><strong>Statut:</strong> {resultat.est_en_regle ? "✅ EN RÈGLE" : "❌ EN INFRACTION"}</p>
                <p style={{ margin: '4px 0' }}><strong>Marque:</strong> {resultat.marque}</p>
                <p style={{ margin: '4px 0' }}><strong>Propriétaire:</strong> {resultat.proprietaire}</p>
              </div>
            )}
            {erreur && <p style={{ color: '#ef4444', marginTop: '12px' }}>{erreur}</p>}
          </div>
        )}

        {/* III. FENÊTRE MENU (PARAMÈTRES ET OPTIONS DU SUPER ADMIN) */}
        {activeTab === 'menu' && (
          <div>
            {menuView === 'main' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {user.role === 'super_admin' && (
                  <>
                    <button onClick={() => setMenuView('create_agent')} style={{ ...styles.buttonPrimary, background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', justifyContent: 'flex-start', padding: '16px' }}>
                      <UserPlus size={22} /> Créer un Compte Agent
                    </button>
                    <button onClick={() => setMenuView('users_list')} style={{ ...styles.buttonPrimary, background: 'rgba(167, 139, 250, 0.2)', border: '1px solid #a78bfa', color: '#a78bfa', justifyContent: 'flex-start', padding: '16px' }}>
                      <Users size={22} /> Gérer la Liste des Agents
                    </button>
                  </>
                )}

                {(user.role === 'admin_dgi' || user.role === 'super_admin') && (
                  <button onClick={() => setMenuView('add_car')} style={{ ...styles.buttonPrimary, background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', justifyContent: 'flex-start', padding: '16px' }}>
                    <PlusCircle size={22} /> Immatriculer un Véhicule (DGI)
                  </button>
                )}
              </div>
            )}

            {/* SOUS-FENÊTRE : CRÉER UN AGENT */}
            {menuView === 'create_agent' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#94a3b8', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#f59e0b' }}>Nouveau Compte Agent</h3>
                <form onSubmit={creerAgent}>
                  <input type="text" placeholder="Identifiant / Email" required value={nouvelAgent.username} onChange={(e) => setNouvelAgent({ ...nouvelAgent, username: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Nom Complet" required value={nouvelAgent.nom_complet} onChange={(e) => setNouvelAgent({ ...nouvelAgent, nom_complet: e.target.value })} style={styles.input} />
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <input type="text" placeholder="Mot de passe" required value={nouvelAgent.password} onChange={(e) => setNouvelAgent({ ...nouvelAgent, password: e.target.value })} style={{ ...styles.input, marginBottom: 0, flex: 1 }} />
                    <button type="button" onClick={genererMotDePasse} style={{ ...styles.buttonPrimary, width: 'auto', padding: '0 14px' }}><Wand2 size={18} /></button>
                  </div>

                  <select value={nouvelAgent.role} onChange={(e) => setNouvelAgent({ ...nouvelAgent, role: e.target.value })} style={styles.input}>
                    <option value="agent_terrain" style={{ background: '#0b1329' }}>Agent de Terrain (Police)</option>
                    <option value="admin_dgi" style={{ background: '#0b1329' }}>Agent DGI (Immatriculation)</option>
                    <option value="super_admin" style={{ background: '#0b1329' }}>Super Admin</option>
                  </select>

                  <button type="submit" style={{ ...styles.buttonPrimary, background: '#f59e0b' }}>Créer l'agent</button>
                </form>
                {agentMsg && <p style={{ marginTop: '12px' }}>{agentMsg}</p>}
              </div>
            )}

            {/* SOUS-FENÊTRE : LISTE DES AGENTS */}
            {menuView === 'users_list' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#94a3b8', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#a78bfa' }}>Agents Enregistrés</h3>
                {listeUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                      <strong>{u.username}</strong>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{u.role}</div>
                    </div>
                    {u.username !== 'admin@kincheck.cd' && (
                      <button onClick={() => supprimerAgent(u.id, u.username)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={18} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* SOUS-FENÊTRE : IMMATRICULATION DGI */}
            {menuView === 'add_car' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#94a3b8', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8' }}>Immatriculer un Véhicule</h3>
                <form onSubmit={enregistrerVehicule}>
                  <input type="text" placeholder="Plaque (ex: 1234AB01)" required value={nouveauVehicule.plaque} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, plaque: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Marque & Modèle" required value={nouveauVehicule.marque} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, marque: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Couleur" required value={nouveauVehicule.couleur} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, couleur: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Nom du Propriétaire" required value={nouveauVehicule.proprietaire} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, proprietaire: e.target.value })} style={styles.input} />
                  <select value={nouveauVehicule.est_en_regle ? "true" : "false"} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, est_en_regle: e.target.value === "true" })} style={styles.input}>
                    <option value="true" style={{ background: '#0b1329' }}>✅ En Règle (Taxes Payées)</option>
                    <option value="false" style={{ background: '#0b1329' }}>❌ En Infraction</option>
                  </select>
                  <button type="submit" style={{ ...styles.buttonPrimary, background: '#0284c7' }}>Enregistrer</button>
                </form>
                {vehiculeMsg && <p style={{ marginTop: '12px' }}>{vehiculeMsg}</p>}
              </div>
            )}
          </div>
        )}

        {/* FENÊTRE HISTORIQUE DES CONTRÔLES */}
        {activeTab === 'history' && (
          <div style={{ ...styles.card, maxWidth: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#4ade80' }}>Historique des Contrôles</h3>
            {listeHistorique.map(h => (
              <div key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{h.plaque_recherchee}</strong>
                  <span style={{ color: h.est_en_regle ? '#4ade80' : '#f87171' }}>{h.est_en_regle ? "Règle" : "Infraction"}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Agent : {h.agent_username} | {new Date(h.date_controle).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* BARRE DE NAVIGATION INFÉRIEURE (4 OPTIONS DU BAS) */}
      <div style={styles.bottomBar}>
        <button onClick={() => setActiveTab('home')} style={styles.navItem(activeTab === 'home')}>
          <Home size={22} />
          <span>Accueil</span>
        </button>

        <button onClick={() => setActiveTab('scan')} style={styles.navItem(activeTab === 'scan')}>
          <Search size={22} />
          <span>Contrôle</span>
        </button>

        <button onClick={() => { setActiveTab('menu'); setMenuView('main'); }} style={styles.navItem(activeTab === 'menu')}>
          <Menu size={22} />
          <span>Menu</span>
        </button>

        <button onClick={() => setActiveTab('history')} style={styles.navItem(activeTab === 'history')}>
          <History size={22} />
          <span>Historique</span>
        </button>
      </div>

    </div>
  );
}

export default App;