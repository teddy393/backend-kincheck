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
  Check
} from 'lucide-react';

const API_URL = "https://kincheck-api.onrender.com";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginErreur, setLoginErreur] = useState('');

  const [plaque, setPlaque] = useState('');
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');

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

  // ÉTATS DES SÉLECTEURS SUR-MESURE (REMPLACE LES SELECT NATIVE)
  const [openSelect, setOpenSelect] = useState(null); // 'role', 'type_engin', 'vignette', 'statut'

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
    if (user && (user.role === 'super_admin' || user.role === 'admin_dgi')) {
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
      const data = await reponse.json();
      if (!reponse.ok) throw new Error(data.detail || "Plaque introuvable ou invalide.");
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Erreur d'analyse IA (${res.status})`);
      }

      const data = await res.json();
      if (data.plaque) {
        setPlaque(data.plaque.toUpperCase().replace(/\s+/g, ''));
      } else {
        setErreur("Aucune plaque lisible n'a été détectée.");
      }
    } catch (err) {
      console.error("Erreur Caméra :", err);
      setErreur(err.message || "Impossible de traiter la photo.");
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
      background: 'rgba(23, 37, 72, 0.85)',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      boxSizing: 'border-box'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(11, 19, 41, 0.9)',
      color: '#fff',
      fontSize: '15px',
      boxSizing: 'border-box',
      marginBottom: '14px'
    },
    customDropdownHeader: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      background: '#0d1836',
      color: '#fff',
      fontSize: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      marginBottom: '6px',
      boxSizing: 'border-box'
    },
    customDropdownList: {
      background: '#0a1228',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.4)',
      overflow: 'hidden',
      marginBottom: '14px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
    },
    customDropdownOption: (selected) => ({
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '14px',
      cursor: 'pointer',
      background: selected ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
      color: selected ? '#60a5fa' : '#e2e8f0',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }),
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

  // 1. FENÊTRE DE CONNEXION
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
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Solution APDNK & Régies Financières</p>
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

  return (
    <div style={styles.appBg}>
      
      {/* HEADER HAUT */}
      <div style={{ padding: '16px', background: '#0b1329', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={28} color="#3b82f6" />
          <span style={{ fontSize: '20px', fontWeight: '800' }}>Kin-Check</span>
        </div>
        <button onClick={() => setUser(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
          <LogOut size={22} />
        </button>
      </div>

      {/* CONTENU NAVIGATION */}
      <div style={{ flex: 1, padding: '16px', paddingBottom: '80px', overflowY: 'auto' }}>
        
        {/* ACCUEIL */}
        {activeTab === 'home' && (
          <div>
            <div style={{ ...styles.card, maxWidth: '100%', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={32} color="#60a5fa" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Session Active</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>{user.username} ({user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin_dgi' ? 'Agent DGI' : 'Agent de Terrain'})</p>
                </div>
              </div>
            </div>

            <div style={{ ...styles.card, maxWidth: '100%' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#60a5fa' }}>Accès Rapides</h3>
              <div style={{ display: 'grid', gridTemplateColumns: user.role === 'agent_terrain' ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <button onClick={() => setActiveTab('scan')} style={{ ...styles.buttonPrimary, fontSize: '14px', padding: '12px' }}>
                  <Search size={18} /> Contrôle Routier
                </button>
                {user.role !== 'agent_terrain' && (
                  <button onClick={() => setActiveTab('menu')} style={{ ...styles.buttonPrimary, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '14px', padding: '12px' }}>
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
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#60a5fa' }}>Contrôle de Plaque RDC</h3>
            <form onSubmit={rechercherVehicule}>
              <input 
                type="text" 
                placeholder="Plaque (ex: 1234AB01, MC1234AB)"
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
                <p style={{ margin: '4px 0' }}><strong>Statut:</strong> {resultat.est_en_regle ? "✅ EN RÈGLE (Vignette Ajour)" : "❌ EN INFRACTION"}</p>
                {resultat.marque && <p style={{ margin: '4px 0' }}><strong>Engin / Marque:</strong> {resultat.type_engin} - {resultat.marque}</p>}
                {resultat.proprietaire && <p style={{ margin: '4px 0' }}><strong>Propriétaire:</strong> {resultat.proprietaire}</p>}
                
                {resultat.calcul_fiscal && !resultat.est_en_regle && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.2)', fontSize: '14px' }}>
                    <p style={{ margin: '2px 0', color: '#f87171' }}><strong>Arriérés :</strong> {resultat.calcul_fiscal.annees_retard} An(s) de retard</p>
                    <p style={{ margin: '2px 0' }}><strong>Vignette Duge :</strong> {resultat.calcul_fiscal.montant_vignette_du?.toLocaleString()} CDF</p>
                    <p style={{ margin: '2px 0' }}><strong>Amende Forfaitaire :</strong> {resultat.calcul_fiscal.amende_forfaitaire?.toLocaleString()} CDF</p>
                    <h3 style={{ margin: '8px 0 0 0', color: '#ef4444' }}>TOTAL À RECOUVRIR : {resultat.calcul_fiscal.total_a_payer?.toLocaleString()} CDF</h3>
                  </div>
                )}
              </div>
            )}
            {erreur && <p style={{ color: '#ef4444', marginTop: '12px' }}>{erreur}</p>}
          </div>
        )}

        {/* MENU GESTION (DGI & SUPER ADMIN) */}
        {activeTab === 'menu' && user.role !== 'agent_terrain' && (
          <div>
            {menuView === 'main' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {user.role === 'super_admin' && (
                  <>
                    <button onClick={() => setMenuView('create_agent')} style={{ ...styles.buttonPrimary, background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', justifyContent: 'flex-start', padding: '16px' }}>
                      <UserPlus size={22} /> Créer un Compte Agent
                    </button>
                    <button onClick={() => setMenuView('users_list')} style={{ ...styles.buttonPrimary, background: 'rgba(167, 139, 250, 0.2)', border: '1px solid #a78bfa', color: '#a78bfa', justifyContent: 'flex-start', padding: '16px' }}>
                      <Users size={22} /> Gérer les Agents
                    </button>
                  </>
                )}

                {(user.role === 'admin_dgi' || user.role === 'super_admin') && (
                  <>
                    <button onClick={() => setMenuView('add_car')} style={{ ...styles.buttonPrimary, background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', justifyContent: 'flex-start', padding: '16px' }}>
                      <PlusCircle size={22} /> Immatriculer un Engin (DGI)
                    </button>
                    <button onClick={() => setMenuView('import_csv')} style={{ ...styles.buttonPrimary, background: 'rgba(52, 211, 153, 0.2)', border: '1px solid #34d399', color: '#34d399', justifyContent: 'flex-start', padding: '16px' }}>
                      <FileSpreadsheet size={22} /> Importation de Masse (CSV)
                    </button>
                  </>
                )}
              </div>
            )}

            {/* IMMATRICULATION DGI - DROPDOWNS PROFESSIONNELS SUR-MESURE */}
            {menuView === 'add_car' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#94a3b8', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8' }}>Immatriculation DGI</h3>
                <form onSubmit={enregistrerVehicule}>
                  <input type="text" placeholder="Plaque RDC (ex: 1234AB01, MC1234AB)" required value={nouveauVehicule.plaque} onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, plaque: e.target.value })} style={styles.input} />
                  
                  {/* SÉLECTEUR TYPE D'ENGIN */}
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
                  
                  {/* SÉLECTEUR VIGNETTE */}
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

                  {/* SÉLECTEUR STATUT */}
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

            {/* IMPORTATION MASSE CSV */}
            {menuView === 'import_csv' && (
              <div style={{ ...styles.card, maxWidth: '100%' }}>
                <button onClick={() => setMenuView('main')} style={{ background: 'none', border: 'none', color: '#94a3b8', marginBottom: '12px', cursor: 'pointer' }}>← Retour au Menu</button>
                <h3 style={{ margin: '0 0 16px 0', color: '#34d399' }}>Importation Fichier CSV (DGI)</h3>
                <form onSubmit={importerCSV}>
                  <input type="file" accept=".csv" required onChange={(e) => setCsvFile(e.target.files[0])} style={styles.input} />
                  <button type="submit" style={{ ...styles.buttonPrimary, background: '#059669' }}>Charger la base de données</button>
                </form>
                {csvMsg && <p style={{ marginTop: '12px' }}>{csvMsg}</p>}
              </div>
            )}

            {/* CRÉATION D'AGENTS - DÉSIGNATION RÉALISTE DU RÔLE TERRAIN */}
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

                  {/* SÉLECTEUR RÔLE PRO */}
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

                  <button type="submit" style={{ ...styles.buttonPrimary, background: '#f59e0b', marginTop: '10px' }}>Créer l'agent</button>
                </form>
                {agentMsg && <p style={{ marginTop: '12px' }}>{agentMsg}</p>}
              </div>
            )}

            {/* LISTE DES AGENTS */}
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
          </div>
        )}

        {/* HISTORIQUE DES CONTRÔLES */}
        {activeTab === 'history' && (
          <div style={{ ...styles.card, maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#4ade80' }}>Historique des Contrôles</h3>
              <button 
                onClick={chargerDonneesAdmin}
                style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#60a5fa', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
              >
                🔄 Actualiser
              </button>
            </div>
            
            {listeHistorique.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aucun contrôle enregistré pour le moment.</p>
            ) : (
              listeHistorique.map(h => (
                <div key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{h.plaque_recherchee}</strong>
                    <span style={{ color: h.est_en_regle ? '#4ade80' : '#f87171' }}>{h.est_en_regle ? "Règle" : "Infraction"}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Agent : {h.agent_username}</div>
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