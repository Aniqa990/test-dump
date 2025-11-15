"""
Load testing script to test parallel requests
Tests what happens when making more than 5 requests per second
"""

import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from collections import defaultdict
import json

# API base URL
BASE_URL = "http://127.0.0.1:8001"

def send_request(request_id, language="python", code="print('Hello from request', {})", stdin=""):
    """Send a single request to the /run endpoint"""
    url = f"{BASE_URL}/run"
    payload = {
        "language": language,
        "code": code.format(request_id),
        "stdin": stdin
    }
    
    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=30)
        elapsed_time = time.time() - start_time
        
        return {
            "request_id": request_id,
            "status_code": response.status_code,
            "response_time": elapsed_time,
            "success": response.status_code == 200,
            "error": None,
            "response_data": response.json() if response.status_code == 200 else None
        }
    except requests.exceptions.Timeout:
        return {
            "request_id": request_id,
            "status_code": None,
            "response_time": time.time() - start_time,
            "success": False,
            "error": "Timeout",
            "response_data": None
        }
    except Exception as e:
        return {
            "request_id": request_id,
            "status_code": None,
            "response_time": time.time() - start_time,
            "success": False,
            "error": str(e),
            "response_data": None
        }

def load_test(num_requests=10, concurrent_requests=5, delay_between_batches=0):
    """
    Run load test with parallel requests
    
    Args:
        num_requests: Total number of requests to send
        concurrent_requests: Number of requests to send in parallel (concurrent)
        delay_between_batches: Delay in seconds between batches (0 = all at once)
    """
    print("="*80)
    print("🚀 LOAD TEST - Parallel Request Testing")
    print("="*80)
    print(f"Total Requests: {num_requests}")
    print(f"Concurrent Requests: {concurrent_requests}")
    print(f"Expected Rate: ~{concurrent_requests / delay_between_batches if delay_between_batches > 0 else 'unlimited'} req/sec")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    results = []
    start_time = time.time()
    
    # Calculate number of batches needed
    num_batches = (num_requests + concurrent_requests - 1) // concurrent_requests
    
    for batch_num in range(num_batches):
        batch_start = batch_num * concurrent_requests
        batch_end = min(batch_start + concurrent_requests, num_requests)
        batch_size = batch_end - batch_start
        
        print(f"\n📦 Batch {batch_num + 1}/{num_batches} - Sending {batch_size} requests in parallel...")
        
        # Send requests in parallel for this batch
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [
                executor.submit(send_request, request_id)
                for request_id in range(batch_start, batch_end)
            ]
            
            # Collect results as they complete
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                
                status_icon = "✅" if result["success"] else "❌"
                status_str = str(result['status_code']) if result['status_code'] else 'N/A'
                status_str = status_str.ljust(3)
                print(f"   {status_icon} Request #{result['request_id']:3d} - "
                      f"Status: {status_str} - "
                      f"Time: {result['response_time']:.3f}s - "
                      f"{result['error'] or 'OK'}")
        
        # Delay between batches if specified
        if delay_between_batches > 0 and batch_num < num_batches - 1:
            time.sleep(delay_between_batches)
    
    total_time = time.time() - start_time
    
    # Analyze results
    print("\n" + "="*80)
    print("📊 LOAD TEST RESULTS")
    print("="*80)
    
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]
    
    print(f"Total Requests: {len(results)}")
    print(f"✅ Successful: {len(successful)}")
    print(f"❌ Failed: {len(failed)}")
    print(f"Success Rate: {(len(successful)/len(results)*100):.1f}%")
    print(f"Total Time: {total_time:.2f}s")
    print(f"Average Requests/Second: {len(results)/total_time:.2f}")
    
    if successful:
        response_times = [r["response_time"] for r in successful]
        print(f"\n⏱️  Response Time Statistics (successful requests):")
        print(f"   Min: {min(response_times):.3f}s")
        print(f"   Max: {max(response_times):.3f}s")
        print(f"   Avg: {sum(response_times)/len(response_times):.3f}s")
        print(f"   Median: {sorted(response_times)[len(response_times)//2]:.3f}s")
    
    if failed:
        print(f"\n❌ Failure Analysis:")
        error_counts = defaultdict(int)
        for r in failed:
            error_key = f"Status {r['status_code']}" if r['status_code'] else r['error'] or "Unknown"
            error_counts[error_key] += 1
        
        for error, count in error_counts.items():
            print(f"   {error}: {count}")
        
        print(f"\nFailed Request Details:")
        for r in failed[:10]:  # Show first 10 failures
            error_msg = r['error'] if r['error'] else f"Status {r['status_code']}"
            print(f"   Request #{r['request_id']}: {error_msg}")
        if len(failed) > 10:
            print(f"   ... and {len(failed) - 10} more failures")
    
    # Check for rate limiting
    if len(failed) > 0:
        rate_limit_errors = [r for r in failed if r.get("status_code") == 429]
        if rate_limit_errors:
            print(f"\n⚠️  RATE LIMITING DETECTED:")
            print(f"   {len(rate_limit_errors)} requests were rate-limited (HTTP 429)")
            print(f"   This suggests the system has rate limiting enabled")
    
    print("="*80)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    return results

def test_error_logging_under_load(num_requests=20, concurrent_requests=10):
    """Test if errors are logged correctly under load"""
    print("\n" + "="*80)
    print("🧪 TESTING ERROR LOGGING UNDER LOAD")
    print("="*80)
    print("Sending requests with intentional errors...")
    
    # Mix of successful and error requests
    test_cases = [
        ("print('Success')", ""),  # Success
        ("print(hello)", ""),  # NameError
        ("print('hello'", ""),  # SyntaxError
        ("x = 10 / 0", ""),  # ZeroDivisionError
        ("print('Success 2')", ""),  # Success
    ]
    
    results = []
    with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
        futures = []
        for i in range(num_requests):
            code, stdin = test_cases[i % len(test_cases)]
            future = executor.submit(send_request, i, code=code, stdin=stdin)
            futures.append(future)
        
        for future in as_completed(futures):
            results.append(future.result())
    
    print(f"\n✅ Sent {num_requests} requests (mix of success and errors)")
    print(f"   Check error logs with: python view_logs.py")
    print(f"   Expected: ~{num_requests * 3 // 5} errors should be logged")

if __name__ == "__main__":
    import sys
    
    # Default test: 20 requests, 10 concurrent (should exceed 5 req/sec)
    num_requests = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    concurrent = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    print("💡 TIP: This will test what happens when exceeding 5 requests/second")
    print("   Adjust parameters: python load_test.py <num_requests> <concurrent>")
    print()
    
    # Run load test
    results = load_test(
        num_requests=num_requests,
        concurrent_requests=concurrent,
        delay_between_batches=0  # No delay = maximum rate
    )
    
    # Test error logging under load
    test_error_logging_under_load(num_requests=15, concurrent_requests=8)

