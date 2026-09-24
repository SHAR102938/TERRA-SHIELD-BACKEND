
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import geometry, materials, climate, analysis

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the TERRA-SHIELD API"}