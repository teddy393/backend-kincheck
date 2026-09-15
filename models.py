from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nom_complet = Column(String)
    role = Column(String, default="agent_terrain")
    photo_url = Column(String, nullable=True)

class Vehicule(Base):
    __tablename__ = "vehicules"

    id = Column(Integer, primary_key=True, index=True)
    plaque = Column(String, unique=True, index=True, nullable=False)
    marque = Column(String)
    couleur = Column(String, nullable=True)     # <-- Nouveau champ Couleur
    proprietaire = Column(String)
    est_en_regle = Column(Boolean, default=True)
    photo_url = Column(String, nullable=True)   # <-- Nouveau champ Photo du véhicule

class HistoriqueControle(Base):
    __tablename__ = "historique_controles"

    id = Column(Integer, primary_key=True, index=True)
    agent_username = Column(String, nullable=False)
    plaque_recherchee = Column(String, nullable=False)
    date_controle = Column(DateTime, default=datetime.utcnow)
    est_en_regle = Column(Boolean, nullable=False)