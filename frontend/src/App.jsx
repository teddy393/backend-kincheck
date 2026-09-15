import { useState, useEffect } from 'react';
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
  ArrowUpDown,
  Car,
  Camera,
  AlertCircle,
  Wand2,
  Copy,
  Check,
  PlusCircle,
  FileText
} from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginErreur, setLoginErreur] = useState('');

  const [plaque, setPlaque] = useState('');
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');

  // États Formulaire Enregistrement Véhicule (avec Couleur et Photo)
  const [nouveauVehicule, setNouveauVehicule] = useState({
    plaque: '',
    marque: '',
    couleur: '',
    proprietaire: '',
    est_en_regle: true
  });
  const [photoVehicule, setPhotoVehicule] = useState(null);
  const [vehiculeMsg, setVehiculeMsg] = useState('');

  // États Super Admin (Agents)
  const [nouvelAgent, setNouvelAgent] = useState({ 
    username: '', 
    password: '', 
    nom_complet: '', 
    role: 'agent_terrain' 
  });
  const [fichierPhoto, setFichierPhoto] = useState(null);
  const [agentMsg, setAgentMsg] = useState('');
  const [copieSuccess, setCopieSuccess] = useState(false);
  const [listeUsers, setListeUsers] = useState([]);
  const [listeHistorique, setListeHistorique] = useState([]);

  // Tri dynamique
  const [sortField, setSortField] = useState('date_controle');
  const [sortAsc, setSortAsc] = useState(false);

  // Générateur de mot de passe
  const genererMotDePasse = () => {
    const majuscules = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const minuscules = "abcdefghijkmnopqrstuvwxyz";
    const chiffres = "23456789";
    const symboles = "!@#$%!";

    const tous = majuscules + minuscules + chiffres + symboles;
    let pwd = "";
    pwd += majuscules[Math.floor(Math.random() * majuscules.length)];
    pwd += minuscules[Math.floor(Math.random() * minuscules.length)];
    pwd += chiffres[Math.floor(Math.random() * chiffres.length)];
    pwd += symboles[Math.floor(Math.random() * symboles.length)];

    for (let i = 0; i < 6; i++) {
      pwd += tous[Math.floor(Math.random() * tous.length)];
    }

    const pwdMelange = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setNouvelAgent(prev => ({ ...prev, password: pwdMelange }));
    setCopieSuccess(false);
  };

  const copierMotDePasse = () => {
    if (!nouvelAgent.password) return;
    navigator.clipboard.writeText(nouvelAgent.password);
    setCopieSuccess(true);
    setTimeout(() => setCopieSuccess(false), 2000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErreur('');
    try {
      const reponse = await fetch('http://10.161.110.232:8000/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (!reponse.ok) throw new Error("Identifiants incorrects.");
      const data = await reponse.json();
      
      setUser({ 
        token: data.access_token, 
        role: data.role, 
        username: loginForm.username 
      });
    } catch (err) {
      setLoginErreur(err.message);
    }
  };

  const chargerDonneesAdmin = async () => {
    try {
      const resUsers = await fetch('http://10.161.110.232:8000/token/api/v1/users/');
      if (resUsers.ok) setListeUsers(await resUsers.json());
      
      const resHist = await fetch('http://10.161.110.232:8000/token/api/v1/historique/');
      if (resHist.ok) setListeHistorique(await resHist.json());
    } catch (err) {
      console.error("Erreur de chargement admin", err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      chargerDonneesAdmin();
    }
  }, [user]);

  // RECHERCHE DE PLAQUE MANUELLE
  const rechercherVehicule = async (e) => {
    e.preventDefault();
    setErreur('');
    setResultat(null);

    const plaqueClean = plaque.trim();
    if (!plaqueClean) {
      setErreur("Veuillez saisir un numéro de plaque obligatoire avant de lancer la vérification.");
      return;
    }

    try {
      const reponse = await fetch(`http://10.161.110.232:8000/token/api/v1/vehicules/${encodeURIComponent(plaqueClean)}?agent_username=${user.username}`);
      if (!reponse.ok) throw new Error("Plaque introuvable ou véhicule non enregistré.");
      setResultat(await reponse.json());
    } catch (err) {
      setErreur(err.message);
    } finally {
      if (user && user.role === 'super_admin') chargerDonneesAdmin();
    }
  };

  // SCAN ET RECONNAISSANCE DE PLAQUE PAR PHOTO (GROQ IA)
  const analyserPlaqueParPhoto = async (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;

    setErreur('');
    setVehiculeMsg('');
    const formData = new FormData();
    formData.append('file', fichier);

    try {
      const res = await fetch('http://10.161.110.232:8000/token/api/v1/ia/analyser-plaque', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error("Erreur lors de l'analyse par l'IA.");
      const data = await res.json();
      
      if (data.plaque) {
        setPlaque(data.plaque.toUpperCase().replace(/\s+/g, ''));
      } else {
        setErreur("Aucune plaque lisible n'a été détectée sur la photo.");
      }
    } catch (err) {
      setErreur("L'IA n'a pas pu lire la plaque sur cette photo.");
    }
  };

  // ENREGISTREMENT VÉHICULE
  const enregistrerVehicule = async (e) => {
    e.preventDefault();
    setVehiculeMsg('');

    try {
      const reponse = await fetch('http://10.161.110.232:8000/token/api/v1/vehicules/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nouveauVehicule)
      });

      if (!reponse.ok) {
        const errData = await reponse.json();
        throw new Error(errData.detail || "Erreur d'enregistrement du véhicule.");
      }

      const vehiculeCree = await reponse.json();

      if (photoVehicule) {
        const formData = new FormData();
        formData.append('file', photoVehicule);
        await fetch(`http://10.161.110.232:8000/token/api/v1/vehicules/${vehiculeCree.id}/upload_photo`, {
          method: 'POST',
          body: formData
        });
      }

      setVehiculeMsg(`✅ Véhicule immatriculé (${nouveauVehicule.plaque}) enregistré avec succès !`);
      setNouveauVehicule({ plaque: '', marque: '', couleur: '', proprietaire: '', est_en_regle: true });
      setPhotoVehicule(null);
    } catch (err) {
      setVehiculeMsg(`❌ ${err.message}`);
    }
  };

  const creerAgent = async (e) => {
    e.preventDefault();
    setAgentMsg('');

    if (!nouvelAgent.password) {
      setAgentMsg("❌ Veuillez générer ou saisir un mot de passe.");
      return;
    }

    try {
      const reponse = await fetch('http://10.161.110.232:8000/token/api/v1/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: nouvelAgent.username,
          password: nouvelAgent.password,
          nom_complet: nouvelAgent.nom_complet,
          role: nouvelAgent.role
        })
      });

      if (!reponse.ok) throw new Error((await reponse.json()).detail || "Erreur de création.");
      const agentCree = await reponse.json();

      if (fichierPhoto) {
        const formData = new FormData();
        formData.append('file', fichierPhoto);
        await fetch(`http://10.161.110.232:8000/token/api/v1/users/${agentCree.id}/upload_photo`, {
          method: 'POST',
          body: formData
        });
      }

      setAgentMsg(`✅ Agent créé avec succès ! Mot de passe : ${nouvelAgent.password}`);
      setNouvelAgent({ username: '', password: '', nom_complet: '', role: 'agent_terrain' });
      setFichierPhoto(null);
      chargerDonneesAdmin();
    } catch (err) {
      setAgentMsg(`❌ ${err.message}`);
    }
  };

  const supprimerAgent = async (id, username) => {
    if (username === 'admin@kincheck.cd') {
      alert("Impossible de supprimer le Super Admin principal.");
      return;
    }

    if (window.confirm(`Voulez-vous supprimer l'agent ${username} ?`)) {
      try {
        const res = await fetch(`http://10.161.110.232:8000/token/api/v1/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).detail);
        chargerDonneesAdmin();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const historiqueTrie = [...listeHistorique].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'date_controle') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const styles = {
    pageBg: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1329 0%, #101d3b 100%)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#e2e8f0',
      padding: '30px 20px',
      display: 'flex',
      justifyContent: 'center'
    },
    container: {
      width: '100%',
      maxWidth: '960px'
    },
    card: {
      background: 'rgba(23, 37, 72, 0.45)',
      backdropFilter: 'blur(16px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
      marginBottom: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '10px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      background: 'rgba(11, 19, 41, 0.7)',
      color: '#fff',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    buttonPrimary: {
      padding: '12px 20px',
      borderRadius: '10px',
      border: 'none',
      background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
      color: '#fff',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'center',
      transition: 'opacity 0.2s'
    },
    thSortable: {
      padding: '12px 16px',
      cursor: 'pointer',
      userSelect: 'none',
      color: '#94a3b8',
      fontSize: '13px',
      fontWeight: '600'
    }
  };

  // ECRAN DE CONNEXION
  if (!user) {
    return (
      <div style={styles.pageBg}>
        <div style={{ ...styles.container, maxWidth: '400px', marginTop: '60px' }}>
          <div style={styles.card}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '14px', background: 'rgba(37, 99, 235, 0.2)', color: '#3b82f6', marginBottom: '12px' }}>
                <ShieldCheck size={36} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Kin-Check APDNK</h1>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>Système de contrôle d'immatriculation</p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Identifiant</label>
                <input 
                  type="text" 
                  required
                  placeholder="admin@kincheck.cd"
                  style={styles.input}
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Mot de passe</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  style={styles.input}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>

              <button type="submit" style={{ ...styles.buttonPrimary, width: '100%' }}>
                Se connecter
              </button>
            </form>

            {loginErreur && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {loginErreur}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD PRINCIPAL
  return (
    <div style={styles.pageBg}>
      <div style={styles.container}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Kin-Check APDNK</h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Session : <strong>{user.username}</strong> ({user.role})</span>
            </div>
          </div>

          <button 
            onClick={() => setUser(null)}
            style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        {/* MODULE 1: RECHERCHE VÉHICULE & SCAN IA */}
        <div style={styles.card}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} /> Contrôle Routier Instantané
          </h3>
          
          <form onSubmit={rechercherVehicule} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              required
              placeholder="Saisir ou scanner la plaque (ex: 1234AB01)"
              value={plaque}
              onChange={(e) => setPlaque(e.target.value)}
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            />

            {/* BOUTON CAMÉRA POUR L'IA */}
            <label 
              title="Prendre une photo ou charger une image"
              style={{ 
                cursor: 'pointer', 
                padding: '12px', 
                borderRadius: '10px', 
                background: 'rgba(59, 130, 246, 0.2)', 
                border: '1px solid rgba(59, 130, 246, 0.4)', 
                color: '#60a5fa', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Camera size={20} />
              <input 
                type="file" 
                accept="image/*" 
                onChange={analyserPlaqueParPhoto} 
                style={{ display: 'none' }} 
              />
            </label>

            <button 
              type="submit" 
              disabled={!plaque.trim()} 
              style={{ 
                ...styles.buttonPrimary, 
                opacity: plaque.trim() ? 1 : 0.5, 
                cursor: plaque.trim() ? 'pointer' : 'not-allowed' 
              }}
            >
              <Car size={18} /> Vérifier
            </button>
          </form>

          {resultat && (
            <div style={{ marginTop: '20px', padding: '18px', borderRadius: '14px', background: resultat.est_en_regle ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${resultat.est_en_regle ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                {resultat.photo_url && (
                  <img 
                    src={resultat.photo_url} 
                    alt="Photo du véhicule" 
                    style={{ width: '120px', height: '90px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '1px' }}>{resultat.plaque}</span>
                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: resultat.est_en_regle ? '#22c55e' : '#ef4444', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {resultat.est_en_regle ? <><CheckCircle2 size={14} /> EN RÈGLE</> : <><XCircle size={14} /> EN INFRACTION</>}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', color: '#cbd5e1', fontSize: '14px' }}><strong>Marque :</strong> {resultat.marque}</p>
                  <p style={{ margin: '4px 0', color: '#cbd5e1', fontSize: '14px' }}><strong>Couleur :</strong> {resultat.couleur || 'Non spécifiée'}</p>
                  <p style={{ margin: '4px 0', color: '#cbd5e1', fontSize: '14px' }}><strong>Propriétaire :</strong> {resultat.proprietaire}</p>
                </div>
              </div>
            </div>
          )}

          {erreur && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {erreur}
            </div>
          )}
        </div>

        {/* MODULE 2: IMMATRICULATION VÉHICULES (AGENT DGI & SUPER ADMIN) */}
        {(user.role === 'admin_dgi' || user.role === 'super_admin') && (
          <div style={styles.card}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={18} /> Service DGI : Immatriculer un Nouveau Véhicule
            </h3>
            <form onSubmit={enregistrerVehicule}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Numéro de Plaque</label>
                  <input 
                    type="text" 
                    placeholder="ex: 1234AB01" 
                    required
                    value={nouveauVehicule.plaque}
                    onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, plaque: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Marque & Modèle</label>
                  <input 
                    type="text" 
                    placeholder="ex: Toyota Hilux" 
                    required
                    value={nouveauVehicule.marque}
                    onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, marque: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Couleur du Véhicule</label>
                  <input 
                    type="text" 
                    placeholder="ex: Noir Métallisé / Rouge" 
                    required
                    value={nouveauVehicule.couleur}
                    onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, couleur: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nom du Propriétaire</label>
                  <input 
                    type="text" 
                    placeholder="ex: Kabongo Mukendi" 
                    required
                    value={nouveauVehicule.proprietaire}
                    onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, proprietaire: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Camera size={14} /> Photo du Véhicule (Optionnelle)
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setPhotoVehicule(e.target.files[0])}
                    style={{ ...styles.input, padding: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Statut Fiscale / Taxe</label>
                  <select 
                    value={nouveauVehicule.est_en_regle ? "true" : "false"}
                    onChange={(e) => setNouveauVehicule({ ...nouveauVehicule, est_en_regle: e.target.value === "true" })}
                    style={styles.input}
                  >
                    <option value="true" style={{ background: '#0b1329' }}>✅ En Règle (Taxes Payées)</option>
                    <option value="false" style={{ background: '#0b1329' }}>❌ En Infraction (Taxes Dues)</option>
                  </select>
                </div>
              </div>

              <button type="submit" style={{ ...styles.buttonPrimary, width: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }}>
                <FileText size={18} /> Valider l'immatriculation du véhicule
              </button>
            </form>

            {vehiculeMsg && (
              <div style={{ marginTop: '14px', fontSize: '13px', color: vehiculeMsg.includes('✅') ? '#4ade80' : '#f87171' }}>
                {vehiculeMsg}
              </div>
            )}
          </div>
        )}

        {/* MODULE 3: ADMINISTRATION COMPTES & HISTORIQUE (SUPER ADMIN) */}
        {user.role === 'super_admin' && (
          <>
            <div style={styles.card}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} /> Administration : Créer un Agent
              </h3>

              <form onSubmit={creerAgent}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Identifiant / Email</label>
                    <input 
                      type="text" 
                      placeholder="ex: agent.kabeya@kincheck.cd" 
                      required
                      value={nouvelAgent.username}
                      onChange={(e) => setNouvelAgent({ ...nouvelAgent, username: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nom complet</label>
                    <input 
                      type="text" 
                      placeholder="ex: Agent Kabeya" 
                      required
                      value={nouvelAgent.nom_complet}
                      onChange={(e) => setNouvelAgent({ ...nouvelAgent, nom_complet: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Mot de passe attribué</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Générer un mot de passe ->" 
                      required
                      value={nouvelAgent.password}
                      onChange={(e) => setNouvelAgent({ ...nouvelAgent, password: e.target.value })}
                      style={{ ...styles.input, marginBottom: 0, flex: 1, fontFamily: 'monospace', letterSpacing: '1px' }}
                    />
                    <button 
                      type="button" 
                      onClick={genererMotDePasse}
                      style={{ padding: '0 16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Wand2 size={16} /> Générer
                    </button>
                    {nouvelAgent.password && (
                      <button 
                        type="button" 
                        onClick={copierMotDePasse}
                        style={{ padding: '0 16px', borderRadius: '10px', background: copieSuccess ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)', border: `1px solid ${copieSuccess ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`, color: copieSuccess ? '#4ade80' : '#cbd5e1', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {copieSuccess ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier</>}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Camera size={14} /> Photo de Profil (Optionnelle)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setFichierPhoto(e.target.files[0])}
                      style={{ ...styles.input, padding: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Rôle de l'agent</label>
                    <select 
                      value={nouvelAgent.role}
                      onChange={(e) => setNouvelAgent({ ...nouvelAgent, role: e.target.value })}
                      style={styles.input}
                    >
                      <option value="agent_terrain" style={{ background: '#0b1329' }}>Agent de Terrain (Police)</option>
                      <option value="admin_dgi" style={{ background: '#0b1329' }}>Agent DGI (Immatriculation)</option>
                      <option value="super_admin" style={{ background: '#0b1329' }}>Super Admin</option>
                    </select>
                  </div>
                </div>

                <button type="submit" style={{ ...styles.buttonPrimary, background: 'linear-gradient(90deg, #d97706, #f59e0b)', width: '100%' }}>
                  <UserPlus size={18} /> Créer le compte agent
                </button>
              </form>

              {agentMsg && (
                <div style={{ marginTop: '14px', fontSize: '13px', color: agentMsg.includes('✅') ? '#4ade80' : '#f87171' }}>
                  {agentMsg}
                </div>
              )}
            </div>

            <div style={styles.card}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} /> Liste des Comptes Enregistrés
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '13px' }}>
                    <th style={{ padding: '10px' }}>Photo</th>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Identifiant</th>
                    <th style={{ padding: '10px' }}>Nom</th>
                    <th style={{ padding: '10px' }}>Rôle</th>
                    <th style={{ padding: '10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listeUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
                      <td style={{ padding: '10px' }}>
                        {u.photo_url ? (
                          <img src={u.photo_url} alt={u.username} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>N/A</div>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>{u.id}</td>
                      <td style={{ padding: '10px', fontWeight: '500' }}>{u.username}</td>
                      <td style={{ padding: '10px' }}>{u.nom_complet || '-'}</td>
                      <td style={{ padding: '10px', color: '#60a5fa' }}>{u.role}</td>
                      <td style={{ padding: '10px' }}>
                        {u.username !== 'admin@kincheck.cd' ? (
                          <button 
                            onClick={() => supprimerAgent(u.id, u.username)}
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#f87171', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '12px' }}>Protégé</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.card}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} /> Historique Global des Contrôles
              </h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={styles.thSortable} onClick={() => handleSort('date_controle')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Date & Heure <ArrowUpDown size={14} />
                      </div>
                    </th>
                    <th style={styles.thSortable} onClick={() => handleSort('agent_username')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Agent <ArrowUpDown size={14} />
                      </div>
                    </th>
                    <th style={styles.thSortable} onClick={() => handleSort('plaque_recherchee')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Plaque <ArrowUpDown size={14} />
                      </div>
                    </th>
                    <th style={styles.thSortable} onClick={() => handleSort('est_en_regle')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Statut <ArrowUpDown size={14} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historiqueTrie.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{new Date(h.date_controle).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{h.agent_username}</td>
                      <td style={{ padding: '12px 16px', letterSpacing: '0.5px' }}>{h.plaque_recherchee}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: h.est_en_regle ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: h.est_en_regle ? '#4ade80' : '#f87171', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {h.est_en_regle ? <><CheckCircle2 size={13} /> En règle</> : <><XCircle size={13} /> Infraction</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default App;