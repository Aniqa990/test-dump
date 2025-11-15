
from database import SessionLocal, engine
from models import Base, Team, Problem, TestCase, CodeDraft
import bcrypt

# Create all tables in the database
Base.metadata.create_all(bind=engine)

# Create a new session
db = SessionLocal()

try:
    # Check if data already exists
    if db.query(Team).count() == 0:
        print("Database is empty. Seeding with initial data...")

        # Create a default team
        # Hash the password
        hashed_password = bcrypt.hashpw("password".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        default_team = Team(name="Default Team", password=hashed_password)
        db.add(default_team)
        db.commit()
        db.refresh(default_team)
        print(f"Created Team: {default_team.name}")

        # Create 6 problems for each character
        problems_data = [
            {
                "title": "Mantis Problem",
                "buggy_file_blob": "def add_two_numbers(a, b):\n    # This function has a bug\n    return a - b  # Bug: should be +\n\nif __name__ == '__main__':\n    import sys\n    a, b = map(int, sys.stdin.readline().split())\n    print(add_two_numbers(a, b))",
                "test_cases": [
                    {"input": "2 3", "output": "5\n"},
                    {"input": "10 20", "output": "30\n"}
                ]
            },
            {
                "title": "Monkey Problem",
                "buggy_file_blob": "def multiply(a, b):\n    # This function has a bug\n    return a + b  # Bug: should be *\n\nif __name__ == '__main__':\n    import sys\n    a, b = map(int, sys.stdin.readline().split())\n    print(multiply(a, b))",
                "test_cases": [
                    {"input": "3 4", "output": "12\n"},
                    {"input": "7 8", "output": "56\n"}
                ]
            },
            {
                "title": "Viper Problem",
                "buggy_file_blob": "def subtract(a, b):\n    # This function has a bug\n    return a + b  # Bug: should be -\n\nif __name__ == '__main__':\n    import sys\n    a, b = map(int, sys.stdin.readline().split())\n    print(subtract(a, b))",
                "test_cases": [
                    {"input": "10 3", "output": "7\n"},
                    {"input": "20 5", "output": "15\n"}
                ]
            },
            {
                "title": "Crane Problem",
                "buggy_file_blob": "def divide(a, b):\n    # This function has a bug\n    return a * b  # Bug: should be /\n\nif __name__ == '__main__':\n    import sys\n    a, b = map(int, sys.stdin.readline().split())\n    print(divide(a, b))",
                "test_cases": [
                    {"input": "20 4", "output": "5\n"},
                    {"input": "100 10", "output": "10\n"}
                ]
            },
            {
                "title": "Tigress Problem",
                "buggy_file_blob": "def power(a, b):\n    # This function has a bug\n    return a + b  # Bug: should be **\n\nif __name__ == '__main__':\n    import sys\n    a, b = map(int, sys.stdin.readline().split())\n    print(power(a, b))",
                "test_cases": [
                    {"input": "2 3", "output": "8\n"},
                    {"input": "5 2", "output": "25\n"}
                ]
            },
            {
                "title": "Shifu Problem",
                "buggy_file_blob": "def fibonacci(n):\n    # This function has a bug\n    if n <= 1:\n        return 0  # Bug: should return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nif __name__ == '__main__':\n    import sys\n    n = int(sys.stdin.readline())\n    print(fibonacci(n))",
                "test_cases": [
                    {"input": "5", "output": "3\n"},
                    {"input": "6", "output": "5\n"}
                ]
            }
        ]

        for problem_data in problems_data:
            problem = Problem(
                title=problem_data["title"],
                buggy_file_blob=problem_data["buggy_file_blob"]
            )
            db.add(problem)
            db.commit()
            db.refresh(problem)
            print(f"Created Problem: {problem.title}")

            # Add test cases for each problem
            for test_case in problem_data["test_cases"]:
                tc = TestCase(
                    problem_id=problem.id,
                    input_data=test_case["input"],
                    expected_output=test_case["output"]
                )
                db.add(tc)
            db.commit()

        print("Created all 6 problems with test cases.")
        print("Database seeding completed successfully!")
    else:
        print("Database already contains data. Seeding skipped.")

finally:
    # Clean up the session
    db.close()


