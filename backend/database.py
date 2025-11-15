import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# We must specify the path to the .env file
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"

# Configure engine with proper pool settings to avoid connection limit issues
# pool_size: number of connections to maintain
# max_overflow: additional connections that can be created beyond pool_size
# pool_pre_ping: verify connections before using them
# pool_recycle: recycle connections after this many seconds (3600 = 1 hour)
engine = create_engine(
    DATABASE_URL,
    pool_size=5,  # Reduced from default to avoid hitting Supabase limits
    max_overflow=0,  # Don't allow overflow connections
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=False  # Set to True for SQL query logging
)

# Don't test connection at startup - it will be tested when first used
# This prevents holding connections unnecessarily

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()