import requests

PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"

def execute_code(language: str, code: str, stdin: str) -> dict:
    payload = {
        "language": language,
        "version": "*",
        "files": [
            {
                "content": code
            }
        ],
        "stdin": stdin
    }
    response = requests.post(PISTON_API_URL, json=payload)
    return response.json()