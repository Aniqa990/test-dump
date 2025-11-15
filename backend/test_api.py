"""
Test script to send multiple API requests in a loop
Tests the /run endpoint with different code samples and inputs
"""

import requests
import json
import time
from datetime import datetime

# API base URL
BASE_URL = "http://127.0.0.1:8001"

def print_separator():
    print("\n" + "="*80 + "\n")

def test_run_endpoint(test_case_num, language, code, stdin=""):
    """Test the /run endpoint with given parameters"""
    print(f"🧪 Test Case #{test_case_num}")
    print(f"   Language: {language}")
    print(f"   Code: {code[:50]}..." if len(code) > 50 else f"   Code: {code}")
    print(f"   Input: {stdin if stdin else '(empty)'}")
    
    url = f"{BASE_URL}/run"
    payload = {
        "language": language,
        "code": code,
        "stdin": stdin
    }
    
    try:
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=30)
        elapsed_time = time.time() - start_time
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Time: {elapsed_time:.3f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if there's an error in the response
            has_error = False
            if "compile" in data and data["compile"].get("stderr"):
                has_error = True
                print(f"   ⚠️  Compilation Error (logged to error log)")
            elif "run" in data and data["run"].get("stderr"):
                has_error = True
                print(f"   ⚠️  Runtime Error (logged to error log)")
            
            if not has_error:
                print(f"   ✅ Success!")
            
            # Format output nicely
            if "run" in data:
                run_data = data["run"]
                if "stdout" in run_data and run_data["stdout"]:
                    print(f"   Output: {run_data['stdout'].strip()}")
                elif "stderr" in run_data and run_data["stderr"]:
                    print(f"   Error (hidden from participants): Error occurred")
                elif "output" in run_data:
                    print(f"   Output: {run_data['output'].strip()}")
                else:
                    print(f"   Response: {json.dumps(data, indent=2)}")
            elif "compile" in data:
                compile_data = data["compile"]
                if "stderr" in compile_data and compile_data["stderr"]:
                    print(f"   Error (hidden from participants): Error occurred")
                else:
                    print(f"   Response: {json.dumps(data, indent=2)}")
            else:
                print(f"   Response: {json.dumps(data, indent=2)}")
        else:
            print(f"   ❌ Error!")
            try:
                error_data = response.json()
                print(f"   Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Error Text: {response.text}")
        
        return response.status_code == 200, response.json() if response.status_code == 200 else None
        
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request Failed: {str(e)}")
        return False, None
    except Exception as e:
        print(f"   ❌ Unexpected Error: {str(e)}")
        return False, None

def main():
    """Main test function with 6-7 test cases"""
    print("="*80)
    print("🚀 API Test Suite - Running 7 Test Cases")
    print("="*80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test cases - 7 different scenarios (including errors to test logging)
    test_cases = [
        {
            "num": 1,
            "language": "python",
            "code": "print('Hello, World!')",
            "stdin": ""
        },
        {
            "num": 2,
            "language": "python",
            "code": "import sys\na, b = map(int, sys.stdin.readline().split())\nprint(a + b)",
            "stdin": "5 10"
        },
        {
            "num": 3,
            "language": "python",
            "code": "print(hello)",  # ERROR: NameError - undefined variable
            "stdin": ""
        },
        {
            "num": 4,
            "language": "python",
            "code": "print('hello'",  # ERROR: SyntaxError - missing closing parenthesis
            "stdin": ""
        },
        {
            "num": 5,
            "language": "python",
            "code": "import sys\nnumbers = list(map(int, sys.stdin.readline().split()))\nprint(sum(numbers))",
            "stdin": "1 2 3 4 5"
        },
        {
            "num": 6,
            "language": "python",
            "code": "x = 10 / 0",  # ERROR: ZeroDivisionError
            "stdin": ""
        },
        {
            "num": 7,
            "language": "python",
            "code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nimport sys\nn = int(sys.stdin.readline())\nprint(factorial(n))",
            "stdin": "5"
        }
    ]
    
    # Results tracking
    results = []
    success_count = 0
    fail_count = 0
    
    # Run all test cases
    for test_case in test_cases:
        print_separator()
        success, response_data = test_run_endpoint(
            test_case["num"],
            test_case["language"],
            test_case["code"],
            test_case["stdin"]
        )
        
        results.append({
            "test_num": test_case["num"],
            "success": success,
            "response": response_data
        })
        
        if success:
            success_count += 1
        else:
            fail_count += 1
        
        # Small delay between requests to avoid overwhelming the server
        time.sleep(0.5)
    
    # Print summary
    print_separator()
    print("="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {len(test_cases)}")
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {fail_count}")
    print(f"Success Rate: {(success_count/len(test_cases)*100):.1f}%")
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Print detailed results
    print("\n📋 DETAILED RESULTS:")
    for result in results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"Test #{result['test_num']}: {status}")
        if result["response"]:
            print(f"  Response: {json.dumps(result['response'], indent=4)}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test suite failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

