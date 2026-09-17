import { useState, useEffect } from 'react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { 
  ShieldCheck, 
  Search, 
  UserPlus, 
  Users, 
  History, 
  LogOut, 
  Trash2, 
  Car,
  Camera,
  AlertCircle,
  Wand2,
  Home,
  Menu,
  PlusCircle,
  User,
  FileSpreadsheet,
  ChevronDown,
  Check,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Activity,
  Layers,
  QrCode,
  X
} from 'lucide-react';

const API_URL = "https://kincheck-api.onrender.com";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginErreur, setLoginErreur] = useState('');

  const [plaque, setPlaque] = useState('');
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');
  const [amrData, setAmrData] = useState(null);

  const [nouveauVehicule, setNouveauVehicule] = useState({
    plaque: '', marque: '', couleur: '', proprietaire: '', type_engin: 'Voiture', annee_derniere_vignette: 2024, est_en_regle: true
  });
  const [vehiculeMsg, setVehiculeMsg] = useState('');

  const [nouvelAgent, setNouvelAgent] = useState({ 
    username: '', password: '', nom_complet: '', role: 'agent_terrain' 
  });
  const [agentMsg, setAgentMsg] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvMsg, setCsvMsg] = useState('');

  const [listeUsers, setListeUsers] = useState([]);
  const [listeHistorique, setListeHistorique] = useState([]);
  const [menuView, setMenuView] = useState('main');

  const [openSelect, setOpenSelect] = useState(null);

  // ÉCRAN DE DÉMARRAGE (SPLASH SCREEN)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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
      setUser({ token: data.access_token, role: data.role, username: loginForm.username.trim() });
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
    if (user) {
      chargerDonneesAdmin();
    }
  }, [user]);

  const rechercherVehicule = async (e) => {
    e.preventDefault();
    setErreur('');
    setResultat(null);
    setAmrData(null);
    const plaqueClean = plaque.trim();
    if (!plaqueClean) return;

    try {
      const reponse = await fetch(`${API_URL}/api/v1/vehicules/${encodeURIComponent(plaqueClean)}?agent_username=${user.username}`);
      const data = await reponse.json();
      if (!reponse.ok) throw new Error(data.detail || "Erreur de contrôle.");
      setResultat(data);
    } catch (err) {
      setErreur(err.message);
    } finally {
      chargerDonneesAdmin();
    }
  };

  const prendrePhotoIA = async () => {
    try {
      setErreur('');
      setAmrData(null);
      const checkPermission = await CapCamera.requestPermissions();
      if (checkPermission.camera !== 'granted') {
        throw new Error("L'accès à la caméra a été refusé.");
      }

      const image = await CapCamera.getPhoto({
        quality: 60,
        width: 1024,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (!image || !image.base64String) throw new Error("Aucune image capturée.");

      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'plaque.jpg');

      const res = await fetch(`${API_URL}/api/v1/ia/analyser-plaque`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Impossible de lire la plaque.");
      }

      if (data.plaque) {
        setPlaque(data.plaque);
      } else {
        setErreur("Aucune plaque lisible n'a été détectée.");
      }
    } catch (err) {
      console.error("Erreur Caméra :", err);
      setErreur(err.message || "Impossible de traiter la photo.");
    }
  };

  const genererAMR = async () => {
    if (!resultat || !resultat.calcul_fiscal) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/paiements/generer-amr?plaque=${resultat.plaque}&montant=${resultat.calcul_fiscal.total_a_payer}&agent_username=${user.username}`, {
        method: 'POST'
      });
      const data = await res.json();
      setAmrData(data);
    } catch (err) {
      alert("Erreur lors de la génération du QR Code.");
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
      const data = await reponse.json();
      if (!reponse.ok) throw new Error(data.detail || "Erreur d'enregistrement.");

      setVehiculeMsg(`✅ Engin ${data.plaque} enregistré avec succès !`);
      setNouveauVehicule({ plaque: '', marque: '', couleur: '', proprietaire: '', type_engin: 'Voiture', annee_derniere_vignette: 2024, est_en_regle: true });
    } catch (err) {
      setVehiculeMsg(`❌ ${err.message}`);
    }
  };

  const importerCSV = async (e) => {
    e.preventDefault();
    if (!csvFile) return setCsvMsg("❌ Sélectionnez un fichier .CSV");
    setCsvMsg("⏳ Importation en cours...");

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const reponse = await fetch(`${API_URL}/api/v1/vehicules/import_csv`, {
        method: 'POST',
        body: formData
      });
      const data = await reponse.json();
      if (!reponse.ok) throw new Error(data.detail || "Échec de l'importation.");
      
      setCsvMsg(`✅ ${data.vehicules_ajoutes} engins ajoutés (${data.doublons_ignores} doublons ignorés).`);
      setCsvFile(null);
    } catch (err) {
      setCsvMsg(`❌ ${err.message}`);
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
          username: nouvelAgent.username.trim(),
          password: nouvelAgent.password.trim(),
          nom_complet: nouvelAgent.nom_complet.trim(),
          role: nouvelAgent.role
        })
      });
      if (!reponse.ok) throw new Error("Erreur de création.");

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

  const totalControles = listeHistorique.length;
  const enRegleCount = listeHistorique.filter(h => h.est_en_regle).length;
  const infractionsCount = totalControles - enRegleCount;
  const tauxConformite = totalControles > 0 ? Math.round((enRegleCount / totalControles) * 100) : 100;
  const mesControles = listeHistorique.filter(h => h.agent_username === user?.username);

  // STYLE ROUGE PRESTIGE / BLANC NET (INSPIRATION DESIGN)
  const styles = {
    appBg: {
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column'
    },
    splashBg: {
      minHeight: '100vh',
      background: '#991b1b',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
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
      background: '#ffffff',
      borderRadius: '20px',
      padding: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      boxSizing: 'border-box'
    },
    statGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '16px'
    },
    statCard: (borderColor, textColor) => ({
      background: '#ffffff',
      border: `1px solid ${borderColor}`,
      borderRadius: '16px',
      padding: '14px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      color: textColor
    }),
    input: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid #cbd5e1',
      background: '#f8fafc',
      color: '#0f172a',
      fontSize: '15px',
      boxSizing: 'border-box',
      marginBottom: '14px'
    },
    customDropdownHeader: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid #cbd5e1',
      background: '#ffffff',
      color: '#0f172a',
      fontSize: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      marginBottom: '6px',
      boxSizing: 'border-box'
    },
    customDropdownList: {
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #991b1b',
      overflow: 'hidden',
      marginBottom: '14px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
    },
    customDropdownOption: (selected) => ({
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '14px',
      cursor: 'pointer',
      background: selected ? 'rgba(153, 27, 27, 0.08)' : 'transparent',
      color: selected ? '#991b1b' : '#0f172a',
      borderBottom: '1px solid #f1f5f9'
    }),
    buttonPrimary: {
      width: '100%',
      padding: '14px',
      borderRadius: '12px',
      border: 'none',
      background: '#991b1b',
      color: '#ffffff',
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
      width: '100%',
      height: '65px',
      background: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      boxSizing: 'border-box'
    },
    navItem: (active) => ({
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      color: active ? '#991b1b' : '#64748b',
      fontSize: '11px',
      fontWeight: active ? '700' : '500',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px 0'
    })
  };

  // 1. ÉCRAN DE DÉMARRAGE (SPLASH SCREEN)
  if (showSplash) {
    return (
      <div style={styles.splashBg}>
        <div style={{ padding: '20px', borderRadius: '30px', background: 'rgba(255,255,255,0.15)', marginBottom: '20px' }}>
          <ShieldCheck size={64} color="#ffffff" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '1px' }}>Kin-Check</h1>
        <p style={{ color: '#fca5a5', fontSize: '15px', marginTop: '6px' }}>Solution APDNK & Régies Financières</p>
        <div style={{ marginTop: '40px', fontSize: '12px', opacity: 0.8 }}>Kinshasa, RDC</div>
      </div>
    );
  }

  // 2. ÉCRAN DE CONNEXION
  if (!user) {
    return (
      <div style={styles.appBg}>
        <div style={styles.centerScreen}>
          <div style={styles.card}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '20px', background: 'rgba(153, 27, 27, 0.1)', color: '#991b1b', marginBottom: '12px' }}>
                <ShieldCheck size={44} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>Kin-Check</h1>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Portail Sécurisé APDNK</p>
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
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '14px', textAlign: 'center' }}>
                <AlertCircle size={16} inline /> {loginErreur}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appBg}>
      
      {/* HEADER HAUT */}
      <div style={{ padding: '16px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={28} color="#991b1b" />
          <div>
            <span style={{ fontSize: '18px', fontWeight: '800', display: 'block', lineHeight: '1.2', color: '#0f172a' }}>Kin-Check</span>
            <span style={{ fontSize: '10px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span> API Live
            </span>
          </div>
        </div>
        <button onClick={() => setUser(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
          <LogOut size={22} />
        </button>
      </div>

      {/* CONTENU NAVIGATION */}
      <div style={{ flex: 1, padding: '16px', paddingBottom: '80px', overflowY: 'auto' }}>
        
        {/* ONGLET ACCUEIL */}
        {activeTab === 'home' && (
          <div>
            <div style={{ ...styles.card, maxWidth: '100%', marginBottom: '16px', background: '#991b1b', color: '#ffffff', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', color: '#ffffff' }}>
                  <User size={28} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{user.username}</h3>
                  <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: '600', textTransform: 'uppercase' }}>
                    {user.role === 'super_admin' ? 'Super Admin (APDNK)' : user.role === 'admin_dgi' ? 'Agent DGI (Guichet)' : 'Agent de Terrain (Police / DGI)'}
                  </span>
                </div>
              </div>
            </div>

            {/* DASHBOARD PAR RÔLE */}
            {user.role === 'super_admin' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observatoire Provincial</h4>
                <div style={styles.statGrid}>
                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#991b1b' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Total Scans</span>
                      <Activity size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{totalControles}</h2>
                  </div>

                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Conformité</span>
                      <CheckCircle size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{tauxConformite}%</h2>
                  </div>

                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Infractions</span>
                      <AlertTriangle size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{infractionsCount}</h2>
                  </div>

                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Agents Actifs</span>
                      <Users size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{listeUsers.length}</h2>
                  </div>
                </div>
              </div>
            )}

            {/* DASHBOARD AGENT DGI */}
            {user.role === 'admin_dgi' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Performance Guichet DGI</h4>
                <div style={styles.statGrid}>
                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                      <span style={{ fontSize: '12px' }}>Contrôles Total</span>
                      <Layers size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{totalControles}</h2>
                  </div>

                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span style={{ fontSize: '12px' }}>Avis à Recouvrir</span>
                      <DollarSign size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{infractionsCount}</h2>
                  </div>
                </div>
              </div>
            )}

            {/* DASHBOARD AGENT DE TERRAIN */}
            {user.role === 'agent_terrain' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Statistiques de Patrouille</h4>
                <div style={styles.statGrid}>
                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#991b1b' }}>
                      <span style={{ fontSize: '12px' }}>Mes Scans</span>
                      <Search size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{mesControles.length}</h2>
                  </div>

                  <div style={styles.statCard('#cbd5e1', '#0f172a')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span style={{ fontSize: '12px' }}>Infractions</span>
                      <AlertTriangle size={18} />
                    </div>
                    <h2 style={{ margin: '8px 0 0 0', fontSize: '24px' }}>{mesControles.filter(h => !h.est_en_regle).length}</h2>
                  </div>
                </div>
              </div>
            )}

            {/* ACCÈS RAPIDES */}
            <div style={{ ...styles.card, maxWidth: '100%' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#991b1b', textTransform: 'uppercase' }}>Actions Rapides</h4>
              <div style={{ display: 'grid', gridTemplateColumns: user.role === 'agent_terrain' ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <button onClick={() => setActiveTab('scan')} style={styles.buttonPrimary}>
                  <Search size={18} /> Contrôle Routier
                </button>
                {user.role !== 'agent_terrain' && (
                  <button onClick={() => setActiveTab('menu')} style={{ ...styles.buttonPrimary, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                    <Menu size={18} /> Menu Gestion
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* CONTRÔLE ROUTIER */}
        {activeTab === 'scan' && (
          <div style={{ ...styles.card, maxWidth: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#991b1b' }}>Contrôle de Plaque RDC</h3>
            <form onSubmit={rechercherVehicule}>
              <input 
                type="text" 
                placeholder="Plaque (ex: 1234AB01, MC1234AB)"
                value={plaque}
                onChange={(e) => setPlaque(e.target.value)}
                style={styles.input}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={prendrePhotoIA} style={{ ...styles.buttonPrimary, background: '#f1f5f9', color: '#991b1b', border: '1px solid #991b1b', flex: 1 }}>
                  <Camera size={20} /> Photo IA
                </button>
                <button type="submit" style={{ ...styles.buttonPrimary, flex: 1 }}>
                  <Car size={20} /> Vérifier
                </button>
              </div>
            </form>

            {resultat && (
              <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: resultat.est_en_regle ? '#f0fdf4' : '#fef2f2', border: `1px solid ${resultat.est_en_regle ? '#86efac' : '#fecaca'}` }}>
                <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>{resultat.plaque}</h2>
                <p style={{ margin: '4px 0', color: resultat.est_en_regle ? '#16a34a' : '#dc2626', fontWeight: '700' }}>
                  Statut : {resultat.est_en_regle ? "✅ EN RÈGLE (Vignette Ajour)" : "❌ EN INFRACTION"}
                </p>
                {resultat.marque && <p style={{ margin: '4px 0', color: '#334155' }}><strong>Engin / Marque :</strong> {resultat.type_engin} - {resultat.marque}</p>}
                {resultat.proprietaire && <p style={{ margin: '4px 0', color: '#334155' }}><strong>Propriétaire :</strong> {resultat.proprietaire}</p>}
                
                {resultat.calcul_fiscal && !resultat.est_en_regle && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #fecaca', fontSize: '14px' }}>
                    <p style={{ margin: '2px 0', color: '#dc2626' }}><strong>Arriérés :</strong> {resultat.calcul_fiscal.annees_retard} An(s) de retard</p>
                    <p style={{ margin: '2px 0', color: '#334155' }}><strong>Vignette Duge :</strong> {resultat.calcul_fiscal.montant_vignette_du?.toLocaleString()} CDF</p>
                    <p style={{ margin: '2px 0', color: '#334155' }}><strong>Amende Forfaitaire :</strong> {resultat.calcul_fiscal.amende_forfaitaire?.toLocaleString()} CDF</p>
                    <h3 style={{ margin: '8px 0 12px 0', color: '#dc2626' }}>TOTAL À RECOUVRIR : {resultat.calcul_fiscal.total_a_payer?.toLocaleString()} CDF</h3>
                    
                    <button onClick={genererAMR} style={{ ...styles.buttonPrimary, background: '#16a34a', fontSize: '14px', padding: '10px' }}>
                      <QrCode size={18} /> Generer QR Code Mobile Money
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MODALE QR CODE DE PAIEMENT AMR */}
            {amrData && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#ffffff', borderRadius: '12px', border: '2px solid #16a34a', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: '#16a34a' }}>Référence : {amrData.reference}</strong>
                  <X size={18} onClick={() => setAmrData(null)} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', margin: '12px 0' }}>
                  <QrCode size={120} style={{ margin: '0 auto' }} />
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Scannez avec M-Pesa, Orange Money ou Airtel Money pour verser directement au Compte Unique du Trésor</p>
                </div>
                <h3 style={{ margin: 0, color: '#16a34a' }}>{amrData.montant_cdf?.toLocaleString()} CDF</h3>
              </div>
            )}

            {erreur && <p style={{ color: '#dc2626', marginTop: '12px', background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca' }}>{erreur}</p>}
          </div>
        )}

        {/* MENU GESTION */}
        {activeTab === 'menu' && user.role !== 'agent_terrain' && (
          <div>
            {menuView === 'main' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {user.role === 'super_admin' && (
                  <>
                    <button onClick={() => setMenuView('create_agent')} style={{ ...styles.buttonPrimary, background: '#ffffff', border: '1px solid #d97706', color: '#d97706', justifyContent: 'flex-start', padding: '16px' }}>
                      <UserPlus size={22} /> Créer un Compte Agent
                    </button>
                    <button onClick={() => setMenuView('users_list')} style={{ ...styles.buttonPrimary, background: '#ffffff', border: '1px solid #7c3aed', color: '#7c3aed', justifyContent: 'flex-start', padding: '16px' }}>
                      <Users size={22} /> Gérer les Agents
                    </button>
                  </>
                )}

                {(user.role === 'admin_dgi' || user.role === 'super_admin') && (
                  <>
                    <button onClick={() => setMenuView('add_car')} style={{ ...styles.buttonPrimary, background: '#ffffff', border: '1px solid #0284c7', color: '#0284c7', justifyContent: 'flex-start', padding: '16px' }}>
                      <PlusCircle size={22} /> Immatriculer un Engin (DGI)
                    </button>
                    <button onClick={() => setMenuView('import_csv')} style={{ ...styles.buttonPrimary, background: '#ffffff', border: '1px solid #059669', color: '#059669', justifyContent: 'flex-start', padding: '16px' }}>
                      <FileSpreadsheet size={22} /> Importation de Masse (CSV)
                    </button>
                  </>
                )}
              </div>
            )}

            {/* IMMATRICULATION DGI */}
            {menuView === 'add_car' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#64748b', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#0284c7' }}>Immatriculation DGI</h3>
                <form onSubmit={enregistrerVehicule}>
                  <input type="text" placeholder="Plaque RDC (ex: 1234AB01, MC1234AB)" required value={nouveauVehicule.plaque} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, plaque: e.target.value })} style={styles.input} />
                  
                  <div style={styles.customDropdownHeader} onClick={() => setOpenSelect(openSelect === 'type_engin' ? null : 'type_engin')}>
                    <span>{nouveauVehicule.type_engin || "Type d'engin"}</span>
                    <ChevronDown size={18} />
                  </div>
                  {openSelect === 'type_engin' && (
                    <div style={styles.customDropdownList}>
                      {[
                        { label: "Voiture / Taxi / SUV", val: "Voiture" },
                        { label: "Moto / Wewa", val: "Moto" },
                        { label: "Tricycle / Bajaj", val: "Bajaj" },
                        { label: "Camion / Poids Lourds", val: "Camion" }
                      ].map(opt => (
                        <div key={opt.val} style={styles.customDropdownOption(nouveauVehicule.type_engin === opt.val)} onClick={() => { setNouveauVehicule({ ...nouveauVehicule, type_engin: opt.val }); setOpenSelect(null); }}>
                          <span>{opt.label}</span>
                          {nouveauVehicule.type_engin === opt.val && <Check size={16} />}
                        </div>
                      ))}
                    </div>
                  )}

                  <input type="text" placeholder="Marque & Modèle" required value={nouveauVehicule.marque} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, marque: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Couleur" required value={nouveauVehicule.couleur} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, couleur: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Nom du Propriétaire" required value={nouveauVehicule.proprietaire} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, proprietaire: e.target.value })} style={styles.input} />
                  
                  <div style={styles.customDropdownHeader} onClick={() => setOpenSelect(openSelect === 'vignette' ? null : 'vignette')}>
                    <span>
                      {nouveauVehicule.annee_derniere_vignette === 2026 && "Vignette 2026 Payée"}
                      {nouveauVehicule.annee_derniere_vignette === 2025 && "Vignette 2025 Payée (1 An Retard)"}
                      {nouveauVehicule.annee_derniere_vignette === 2024 && "Vignette 2024 Payée (2 Ans Retard)"}
                    </span>
                    <ChevronDown size={18} />
                  </div>
                  {openSelect === 'vignette' && (
                    <div style={styles.customDropdownList}>
                      {[
                        { label: "Vignette 2026 Payée", val: 2026 },
                        { label: "Vignette 2025 Payée (1 An Retard)", val: 2025 },
                        { label: "Vignette 2024 Payée (2 Ans Retard)", val: 2024 }
                      ].map(opt => (
                        <div key={opt.val} style={styles.customDropdownOption(nouveauVehicule.annee_derniere_vignette === opt.val)} onClick={() => { setNouveauVehicule({ ...nouveauVehicule, annee_derniere_vignette: opt.val }); setOpenSelect(null); }}>
                          <span>{opt.label}</span>
                          {nouveauVehicule.annee_derniere_vignette === opt.val && <Check size={16} />}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={styles.customDropdownHeader} onClick={() => setOpenSelect(openSelect === 'statut' ? null : 'statut')}>
                    <span>{nouveauVehicule.est_en_regle ? "✅ Statut : En Règle" : "❌ Statut : En Infraction"}</span>
                    <ChevronDown size={18} />
                  </div>
                  {openSelect === 'statut' && (
                    <div style={styles.customDropdownList}>
                      {[
                        { label: "✅ Statut : En Règle", val: true },
                        { label: "❌ Statut : En Infraction", val: false }
                      ].map(opt => (
                        <div key={opt.val.toString()} style={styles.customDropdownOption(nouveauVehicule.est_en_regle === opt.val)} onClick={() => { setNouveauVehicule({ ...nouveauVehicule, est_en_regle: opt.val }); setOpenSelect(null); }}>
                          <span>{opt.label}</span>
                          {nouveauVehicule.est_en_regle === opt.val && <Check size={16} />}
                        </div>
                      ))}
                    </div>
                  )}

                  <button type="submit" style={{ ...styles.buttonPrimary, background: '#0284c7', marginTop: '10px' }}>Enregistrer l'engin</button>
                </form>
                {vehiculeMsg && <p style={{ marginTop: '12px' }}>{vehiculeMsg}</p>}
              </div>
            )}

            {/* IMPORTATION CSV */}
            {menuView === 'import_csv' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#64748b', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#059669' }}>Importation CSV (DGI)</h3>
                <form onSubmit={importerCSV}>
                  <input type="file" accept=".csv" required onChange={(e) => setCsvFile(e.target.files[0])} style={styles.input} />
                  <button type="submit" style={{ ...styles.buttonPrimary, background: '#059669' }}>Charger la base de données</button>
                </form>
                {csvMsg && <p style={{ marginTop: '12px' }}>{csvMsg}</p>}
              </div>
            )}

            {/* CRÉATION AGENTS */}
            {menuView === 'create_agent' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#64748b', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#d97706' }}>Nouveau Compte Agent</h3>
                <form onSubmit={creerAgent}>
                  <input type="text" placeholder="Identifiant / Email" required value={nouvelAgent.username} onChange={(e) => setNouvelAgent({ ...nouvelAgent, username: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Nom Complet" required value={nouvelAgent.nom_complet} onChange={(e) => setNouvelAgent({ ...nouvelAgent, nom_complet: e.target.value })} style={styles.input} />
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <input type="text" placeholder="Mot de passe" required value={nouvelAgent.password} onChange={(e) => setNouvelAgent({ ...nouvelAgent, password: e.target.value })} style={{ ...styles.input, marginBottom: 0, flex: 1 }} />
                    <button type="button" onClick={genererMotDePasse} style={{ ...styles.buttonPrimary, width: 'auto', padding: '0 14px', background: '#d97706' }}><Wand2 size={18} /></button>
                  </div>

                  <div style={styles.customDropdownHeader} onClick={() => setOpenSelect(openSelect === 'role' ? null : 'role')}>
                    <span>
                      {nouvelAgent.role === 'agent_terrain' && "Agent de Terrain (Police / DGI)"}
                      {nouvelAgent.role === 'admin_dgi' && "Agent DGI (Guichet Immatriculation)"}
                      {nouvelAgent.role === 'super_admin' && "Super Admin (APDNK)"}
                    </span>
                    <ChevronDown size={18} />
                  </div>
                  {openSelect === 'role' && (
                    <div style={styles.customDropdownList}>
                      {[
                        { label: "Agent de Terrain (Police / DGI)", val: "agent_terrain" },
                        { label: "Agent DGI (Guichet Immatriculation)", val: "admin_dgi" },
                        { label: "Super Admin (APDNK)", val: "super_admin" }
                      ].map(opt => (
                        <div key={opt.val} style={styles.customDropdownOption(nouvelAgent.role === opt.val)} onClick={() => { setNouvelAgent({ ...nouvelAgent, role: opt.val }); setOpenSelect(null); }}>
                          <span>{opt.label}</span>
                          {nouvelAgent.role === opt.val && <Check size={16} />}
                        </div>
                      ))}
                    </div>
                  )}

                  <button type="submit" style={{ ...styles.buttonPrimary, background: '#d97706', marginTop: '10px' }}>Créer l'agent</button>
                </form>
                {agentMsg && <p style={{ marginTop: '12px' }}>{agentMsg}</p>}
              </div>
            )}

            {/* LISTE AGENTS */}
            {menuView === 'users_list' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#64748b', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#7c3aed' }}>Agents Enregistrés</h3>
                {listeUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <strong>{u.username}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{u.role}</div>
                    </div>
                    {u.username !== 'admin@kincheck.cd' && (
                      <button onClick={() => supprimerAgent(u.id, u.username)} style={{ background: 'none', border: 'none', color: '#dc2626' }}><Trash2 size={18} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORIQUE */}
        {activeTab === 'history' && (
          <div style={{ ...styles.card, maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#16a34a' }}>Historique des Contrôles</h3>
              <button 
                onClick={chargerDonneesAdmin}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
              >
                🔄 Actualiser
              </button>
            </div>
            
            {listeHistorique.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Aucun contrôle enregistré pour le moment.</p>
            ) : (
              listeHistorique.map(h => (
                <div key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{h.plaque_recherchee}</strong>
                    <span style={{ color: h.est_en_regle ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{h.est_en_regle ? "Règle" : "Infraction"}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Agent : {h.agent_username}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>  

      {/* BARRE DE NAVIGATION BASSE */}
      <div style={styles.bottomBar}>
        <button onClick={() => setActiveTab('home')} style={styles.navItem(activeTab === 'home')}>
          <Home size={22} />
          <span>Accueil</span>
        </button>

        <button onClick={() => setActiveTab('scan')} style={styles.navItem(activeTab === 'scan')}>
          <Search size={22} />
          <span>Contrôle</span>
        </button>

        {user.role !== 'agent_terrain' && (
          <button onClick={() => { setActiveTab('menu'); setMenuView('main'); }} style={styles.navItem(activeTab === 'menu')}>
            <Menu size={22} />
            <span>Menu</span>
          </button>
        )}

        <button onClick={() => setActiveTab('history')} style={styles.navItem(activeTab === 'history')}>
          <History size={22} />
          <span>Historique</span>
        </button>
      </div>

    </div>
  );
}

export default App;