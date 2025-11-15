"""
Simple script to view error logs
Run this to see error logs in a readable format
"""

import json
from pathlib import Path
from datetime import datetime

LOG_FILE = Path(__file__).parent / "logs" / "error_log.jsonl"

def view_logs(limit=50, error_type=None, team_id=None):
    """View error logs in a readable format"""
    if not LOG_FILE.exists():
        print("No error logs found. Log file doesn't exist yet.")
        return
    
    print("="*80)
    print("ERROR LOGS")
    print("="*80)
    print()
    
    logs = []
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        log_entry = json.loads(line)
                        
                        # Apply filters
                        if error_type and log_entry.get("error_type") != error_type:
                            continue
                        if team_id and log_entry.get("team_id") != team_id:
                            continue
                        
                        logs.append(log_entry)
                    except json.JSONDecodeError:
                        continue
        
        # Sort by timestamp (most recent first)
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        logs = logs[:limit]
        
        if not logs:
            print("No logs found matching the criteria.")
            return
        
        for i, log in enumerate(logs, 1):
            print(f"[{i}] {log.get('timestamp', 'Unknown time')}")
            print(f"    Type: {log.get('error_type', 'Unknown')}")
            print(f"    Endpoint: {log.get('endpoint', 'Unknown')}")
            if log.get('team_id'):
                print(f"    Team ID: {log.get('team_id')}")
            if log.get('problem_id'):
                print(f"    Problem ID: {log.get('problem_id')}")
            if log.get('language'):
                print(f"    Language: {log.get('language')}")
            print(f"    Error: {log.get('error_message', 'No message')[:200]}...")
            if log.get('code'):
                print(f"    Code snippet: {log.get('code', '')[:100]}...")
            print("-" * 80)
        
        print(f"\nTotal logs shown: {len(logs)}")
        
    except Exception as e:
        print(f"Error reading logs: {e}")

if __name__ == "__main__":
    import sys
    
    limit = 50
    error_type = None
    team_id = None
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        limit = int(sys.argv[1])
    if len(sys.argv) > 2:
        error_type = sys.argv[2]
    if len(sys.argv) > 3:
        team_id = int(sys.argv[3])
    
    view_logs(limit=limit, error_type=error_type, team_id=team_id)

