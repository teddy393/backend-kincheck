from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import base64
import json
from groq import Groq

import models, schemas, auth
from database import engine, get_db

# Clé API Groq (récupérée via les variables d'environnement sur Render)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY)

os.makedirs("uploads", exist_ok=True)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kin-Check API", version="1.0.0")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- CORRECTION CORS (Correction de allow_headers) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INITIALISATION SUPER ADMIN (Indentation corrigée) ---
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
# --- AGENTS ---
@app.post("/api/v1/users/", response_model=schemas.UserResponse, tags=["Administration"])
def enregistrer_agent(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé.")
    
    hashed_pwd = auth.get_password_hash(user_data.password)
    nouvel_agent = models.User(
        username=user_data.username,
        hashed_password=hashed_pwd,
        nom_complet=user_data.nom_complet,
        role=user_data.role,
        photo_url=user_data.photo_url
    )
    db.add(nouvel_agent)
    db.commit()
    db.refresh(nouvel_agent)
    return nouvel_agent

@app.post("/api/v1/users/{user_id}/upload_photo", tags=["Administration"])
def upload_photo_agent(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Agent non trouvé.")
    
    file_location = f"uploads/user_{user_id}_{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    user.photo_url = f"/{file_location}"
    db.commit()
    return {"photo_url": user.photo_url}

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

# --- HISTORIQUE & VEHICULES ---
@app.get("/api/v1/historique/", response_model=List[schemas.HistoriqueResponse], tags=["Administration"])
def lister_historique(db: Session = Depends(get_db)):
    return db.query(models.HistoriqueControle).order_by(models.HistoriqueControle.date_controle.desc()).all()

@app.get("/api/v1/vehicules/{plaque}", response_model=schemas.VehiculeResponse, tags=["Véhicules"])
def lire_vehicule(plaque: str, agent_username: str = "agent_inconnu", db: Session = Depends(get_db)):
    vehicule = db.query(models.Vehicule).filter(models.Vehicule.plaque == plaque).first()
    if not vehicule:
        entree_log = models.HistoriqueControle(agent_username=agent_username, plaque_recherchee=plaque, est_en_regle=False)
        db.add(entree_log)
        db.commit()
        raise HTTPException(status_code=404, detail="Plaque introuvable ou véhicule non enregistré.")

    entree_log = models.HistoriqueControle(agent_username=agent_username, plaque_recherchee=vehicule.plaque, est_en_regle=vehicule.est_en_regle)
    db.add(entree_log)
    db.commit()
    return vehicule

@app.post("/api/v1/vehicules/", response_model=schemas.VehiculeResponse, tags=["Véhicules"])
def creer_vehicule(vehicule: schemas.VehiculeCreate, db: Session = Depends(get_db)):
    db_vehicule = db.query(models.Vehicule).filter(models.Vehicule.plaque == vehicule.plaque).first()
    if db_vehicule:
        raise HTTPException(status_code=400, detail="Cette plaque est déjà enregistrée.")
    nouveau_vehicule = models.Vehicule(**vehicule.dict())
    db.add(nouveau_vehicule)
    db.commit()
    db.refresh(nouveau_vehicule)
    return nouveau_vehicule

@app.post("/api/v1/vehicules/{vehicule_id}/upload_photo", tags=["Véhicules"])
def upload_photo_vehicule(vehicule_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    vehicule = db.query(models.Vehicule).filter(models.Vehicule.id == vehicule_id).first()
    if not vehicule:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé.")
    
    file_location = f"uploads/vehicule_{vehicule_id}_{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    vehicule.photo_url = f"/{file_location}"
    db.commit()
    return {"photo_url": vehicule.photo_url}

# --- MODULE IA VISION (GROQ) ---
@app.post("/api/v1/ia/analyser-plaque", tags=["IA & Vision Groq"])
async def analyser_plaque_avec_groq(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Modèles Vision actifs chez Groq
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
        return {"plaque": resultat_json.get("plaque", "")}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse IA : {str(e)}")