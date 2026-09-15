# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. URL de la base de données
# Pour SQLite (Local) :
SQLALCHEMY_DATABASE_URL = "sqlite:///./kin_check.db"

# Pour PostgreSQL (Production - exemple d'URL pour Kinshasa) :
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/kin_check_db"

# 2. Création du moteur SQLAlchemy
# (check_same_thread est requis uniquement pour SQLite)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Création de la fabrique de sessions (SessionLocal)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Classe de base pour créer nos modèles/tables
Base = declarative_base()

# 5. Dépendance pour récupérer la base de données dans chaque requête FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()