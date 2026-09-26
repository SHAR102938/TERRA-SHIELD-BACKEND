
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import geometry, materials, climate, analysis
from app.db.database import engine
from app.models import db_models

# Create DB tables
db_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TERRA-SHIELD API",
    description="Backend for the TERRA-SHIELD thermal comfort and shelter design platform.",
    version="0.1.0",
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000", # In case you use create-react-app's default
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(geometry.router, prefix="/api/geometry", tags=["Geometry"])
app.include_router(materials.router, prefix="/api/materials", tags=["Materials"])
app.include_router(climate.router, prefix="/api/climate", tags=["Climate"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
from app.api.routes import projects
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
from app.api.routes import optimize
app.include_router(optimize.router, prefix="/api/optimize", tags=["Optimization"])
from app.api.routes import validation
app.include_router(validation.router, prefix="/api/validation", tags=["Validation"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the TERRA-SHIELD API"}