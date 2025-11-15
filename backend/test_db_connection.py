"""
Simple script to test database connection
Run this to check if your backend can connect to the database
"""

import sys
import os

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine, SessionLocal
    from models import Team, Problem, TestCase
    from sqlalchemy import text
    
    print("="*60)
    print("Testing Database Connection")
    print("="*60)
    
    # Test 1: Try to create a connection
    print("\n[1/3] Testing engine connection...")
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            print("✅ Engine connection successful!")
    except Exception as e:
        print(f"❌ Engine connection failed: {e}")
        sys.exit(1)
    
    # Test 2: Try to create a session and query
    print("\n[2/3] Testing session and query...")
    try:
        db = SessionLocal()
        try:
            # Try a simple query
            team_count = db.query(Team).count()
            problem_count = db.query(Problem).count()
            test_case_count = db.query(TestCase).count()
            
            print("✅ Session query successful!")
            print(f"   - Teams in database: {team_count}")
            print(f"   - Problems in database: {problem_count}")
            print(f"   - Test cases in database: {test_case_count}")
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Session query failed: {e}")
        sys.exit(1)
    
    # Test 3: Test connection pool
    print("\n[3/3] Testing connection pool...")
    try:
        pool = engine.pool
        print(f"✅ Connection pool status:")
        print(f"   - Pool size: {pool.size()}")
        print(f"   - Checked out: {pool.checkedout()}")
        print(f"   - Overflow: {pool.overflow()}")
        print(f"   - Checked in: {pool.checkedin()}")
    except Exception as e:
        print(f"⚠️  Could not get pool info: {e}")
    
    print("\n" + "="*60)
    print("✅ All database connection tests passed!")
    print("="*60)
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend directory")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

