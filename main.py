from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import base64
import json
import re
import csv
import io
from datetime import datetime
from groq import Groq

import models, schemas, auth
from database import engine, get_db

# --- CONFIGURATION & INITIALISATION ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY)

os.makedirs("uploads", exist_ok=True)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kin-Check API - DGI & APDNK Portal", version="2.0.0")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- REGEX DES PLAQUES CONGOLAISES (Normes RDC) ---
PLAQUE_RDC_REGEX = r"^([0-9]{4}[A-Z]{2}[0-9]{2}|[A-Z]{2}[0-9]{4}[A-Z]{2}|[0-9]{3,4}[M][0-9]{2}|MC[0-9]{4}[A-Z]{2}|IT[0-9]{4}|FPMC[0-9]{4})$"

# --- BARÈME FISCAL RDC (CDF) ---
BAREMES_TAXES = {
    "Voiture": {"vignette_annuelle": 75000, "amende_forfaitaire": 50000},
    "Moto": {"vignette_annuelle": 25000, "amende_forfaitaire": 15000},
    "Bajaj": {"vignette_annuelle": 35000, "amende_forfaitaire": 20000},
    "Camion": {"vignette_annuelle": 150000, "amende_forfaitaire": 100000}
}

def valider_and_nettoyer_plaque(plaque: str) -> str:
    plaque_clean = plaque.upper().replace(" ", "").replace("-", "").strip()
    if not re.match(PLAQUE_RDC_REGEX, plaque_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La plaque '{plaque}' ne respecte pas les normes d'immatriculation RDC (ex: 1234AB01, MC1234AB)."
        )
    return plaque_clean

def calculer_dette_fiscale(type_engin: str, annee_derniere_vignette: Optional[int], est_en_regle: bool):
    annee_actuelle = datetime.now().year
    type_key = type_engin if type_engin in BAREMES_TAXES else "Voiture"
    bareme = BAREMES_TAXES[type_key]

    if est_en_regle and (annee_derniere_vignette == annee_actuelle):
        return {
            "est_en_regle": True,
            "annees_retard": 0,
            "montant_vignette_du": 0,
            "amende_forfaitaire": 0,
            "total_a_payer": 0,
            "devise": "CDF"
        }

    # Calcul des arriérés
    derniere_payee = annee_derniere_vignette if annee_derniere_vignette else (annee_actuelle - 1)
    annees_retard = max(1, annee_actuelle - derniere_payee)
    
    montant_vignette = annees_retard * bareme["vignette_annuelle"]
    amende = bareme["amende_forfaitaire"]
    total = montant_vignette + amende

    return {
        "est_en_regle": False,
        "annees_retard": annees_retard,
        "montant_vignette_du": montant_vignette,
        "amende_forfaitaire": amende,
        "total_a_payer": total,
        "devise": "CDF"
    }

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INITIALISATION SUPER ADMIN ---
def init_super_admin():
    db: Session = next(get_db())
    admin = db.query(models.User).filter(models.User.username == "admin@kincheck.cd").first()
    hashed_pwd = auth.get_password_hash("Admin1234!")
    if not admin:
        super_admin = models.User(
            username="admin@kincheck.cd",
            hashed_password=hashed_pwd,
            nom_complet="Directeur Général APDNK",
            role="super_admin",
            photo_url=None
        )
        db.add(super_admin)
    else: 
        admin.hashed_password = hashed_pwd
    db.commit()

@app.on_event("startup")
def startup_event():
    init_super_admin()

# --- AUTHENTIFICATION ---
@app.post("/token", response_model=schemas.Token, tags=["Authentification"])
def login(form_data: dict, db: Session = Depends(get_db)):
    username = form_data.get("username", "").strip()
    password = form_data.get("password", "").strip()

    user = db.query(models.User).filter(models.User.username == username).first()
    
    if not user or not auth.verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

# --- GESTION DES AGENTS ---
@app.post("/api/v1/users/", response_model=schemas.UserResponse, tags=["Administration"])
def enregistrer_agent(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    username_clean = user_data.username.strip()
    db_user = db.query(models.User).filter(models.User.username == username_clean).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé.")
    
    hashed_pwd = auth.get_password_hash(user_data.password.strip())
    nouvel_agent = models.User(
        username=username_clean,
        hashed_password=hashed_pwd,
        nom_complet=user_data.nom_complet.strip(),
        role=user_data.role,
        photo_url=user_data.photo_url
    )
    db.add(nouvel_agent)
    db.commit()
    db.refresh(nouvel_agent)
    return nouvel_agent

@app.get("/api/v1/users/", response_model=List[schemas.UserResponse], tags=["Administration"])
def lister_utilisateurs(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.delete("/api/v1/users/{user_id}", tags=["Administration"])
def supprimer_agent(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if user.username == "admin@kincheck.cd":
        raise HTTPException(status_code=400, detail="Impossible de supprimer le Super Admin principal.")
    db.delete(user)
    db.commit()
    return {"message": "Agent supprimé avec succès."}

# --- VÉHICULES & CONTRÔLE ROUTIER ---
@app.get("/api/v1/vehicules/{plaque}", tags=["Véhicules & Contrôles"])
def lire_vehicule(plaque: str, agent_username: str = "agent_inconnu", db: Session = Depends(get_db)):
    plaque_clean = plaque.upper().replace(" ", "").replace("-", "").strip()
    vehicule = db.query(models.Vehicule).filter(models.Vehicule.plaque == plaque_clean).first()

    if not vehicule:
        entree_log = models.HistoriqueControle(
            agent_username=agent_username,
            plaque_recherchee=plaque_clean,
            est_en_regle=False
        )
        db.add(entree_log)
        db.commit()
        
        # Amende forfaitaire pour véhicule non répertorié à la DGI
        calcul_defaut = calculer_dette_fiscale("Voiture", None, False)
        return {
            "plaque": plaque_clean,
            "statut": "NON_REPERTORIE",
            "est_en_regle": False,
            "message": "Véhicule non immatriculé au répertoire de la DGI / DGRK.",
            "calcul_fiscal": calcul_defaut
        }

    # Calcul de la situation fiscale exacte
    type_engin = getattr(vehicule, "type_engin", "Voiture") or "Voiture"
    derniere_vignette = getattr(vehicule, "annee_derniere_vignette", 2024)
    calcul_fiscal = calculer_dette_fiscale(type_engin, derniere_vignette, vehicule.est_en_regle)

    entree_log = models.HistoriqueControle(
        agent_username=agent_username,
        plaque_recherchee=vehicule.plaque,
        est_en_regle=calcul_fiscal["est_en_regle"]
    )
    db.add(entree_log)
    db.commit()

    return {
        "id": vehicule.id,
        "plaque": vehicule.plaque,
        "marque": vehicule.marque,
        "couleur": vehicule.couleur,
        "proprietaire": vehicule.proprietaire,
        "type_engin": type_engin,
        "est_en_regle": calcul_fiscal["est_en_regle"],
        "calcul_fiscal": calcul_fiscal
    }

@app.post("/api/v1/vehicules/", tags=["Véhicules & DGI"])
def creer_vehicule(vehicule: schemas.VehiculeCreate, db: Session = Depends(get_db)):
    plaque_valide = valider_and_nettoyer_plaque(vehicule.plaque)

    # Vérification Anti-Doublon
    db_vehicule = db.query(models.Vehicule).filter(models.Vehicule.plaque == plaque_valide).first()
    if db_vehicule:
        raise HTTPException(
            status_code=400, 
            detail=f"Anti-Doublon : La plaque {plaque_valide} est déjà enregistrée au nom de {db_vehicule.proprietaire}."
        )

    vehicule_dict = vehicule.dict()
    vehicule_dict["plaque"] = plaque_valide
    
    nouveau_vehicule = models.Vehicule(**vehicule_dict)
    db.add(nouveau_vehicule)
    db.commit()
    db.refresh(nouveau_vehicule)
    return nouveau_vehicule

# --- IMPORTATION DE MASSE (EXCEL / CSV) POUR LA DGI ---
@app.post("/api/v1/vehicules/import_csv", tags=["DGI - Importation de Masse"])
async def importer_vehicules_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Veuillez fournir un fichier au format .CSV")

    contents = await file.read()
    buffer = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(buffer)

    ajoutes = 0
    doublons = 0

    for row in csv_reader:
        try:
            plaque_raw = row.get("plaque", "")
            plaque_clean = valider_and_nettoyer_plaque(plaque_raw)

            existant = db.query(models.Vehicule).filter(models.Vehicule.plaque == plaque_clean).first()
            if existant:
                doublons += 1
                continue

            nouveau = models.Vehicule(
                plaque=plaque_clean,
                marque=row.get("marque", "Inconnue"),
                couleur=row.get("couleur", "Inconnue"),
                proprietaire=row.get("proprietaire", "Inconnu"),
                type_engin=row.get("type_engin", "Voiture"),
                est_en_regle=row.get("est_en_regle", "true").lower() == "true"
            )
            db.add(nouveau)
            ajoutes += 1
        except Exception:
            continue

    db.commit()
    return {
        "message": "Importation terminée avec succès",
        "vehicules_ajoutes": ajoutes,
        "doublons_ignores": doublons
    }

# --- HISTORIQUE ---
@app.get("/api/v1/historique/", response_model=List[schemas.HistoriqueResponse], tags=["Administration"])
def lister_historique(db: Session = Depends(get_db)):
    return db.query(models.HistoriqueControle).order_by(models.HistoriqueControle.date_controle.desc()).all()

# --- MODULE IA VISION (GROQ) ---
@app.post("/api/v1/ia/analyser-plaque", tags=["IA & Vision Groq"])
async def analyser_plaque_avec_groq(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        modeles_vision = [
            "qwen/qwen3.6-27b",
            "qwen/qwen3.8-27b"
        ]
        
        response = None
        dernier_erreur = None

        for model_name in modeles_vision:
            try:
                response = groq_client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text", 
                                    "text": 'Analyse cette image de véhicule. Extrais uniquement le numéro de la plaque d\'immatriculation. Réponds strictly au format JSON : {"plaque": "1234AB01"}.'
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    response_format={"type": "json_object"}
                )
                if response:
                    break
            except Exception as e_model:
                dernier_erreur = e_model
                continue
        
        if not response:
            raise HTTPException(status_code=400, detail=f"Aucun modèle Vision disponible : {str(dernier_erreur)}")
        
        resultat_json = json.loads(response.choices[0].message.content)
        plaque_brute = resultat_json.get("plaque", "")
        plaque_clean = plaque_brute.upper().replace(" ", "").replace("-", "").strip()

        return {"plaque": plaque_clean}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse IA : {str(e)}")