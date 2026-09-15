from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    nom_complet: Optional[str] = None
    role: Optional[str] = "agent_terrain"
    photo_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class VehiculeBase(BaseModel):
    plaque: str
    marque: str
    couleur: Optional[str] = None           # <-- Couleur
    proprietaire: str
    est_en_regle: bool = True
    photo_url: Optional[str] = None         # <-- Photo URL

class VehiculeCreate(VehiculeBase):
    pass

class VehiculeResponse(VehiculeBase):
    id: int
    class Config:
        from_attributes = True

class HistoriqueResponse(BaseModel):
    id: int
    agent_username: str
    plaque_recherchee: str
    date_controle: datetime
    est_en_regle: bool
    class Config:
        from_attributes = True