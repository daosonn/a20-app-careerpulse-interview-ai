import httpx
import asyncio

async def test_endpoint():
    url = "http://127.0.0.1:8000/api/v1/interview/recommend-jobs"
    payload = {
        "cv_text": "Experienced software engineer with Python skills",
        "limit": 5
    }
    # Note: This might fail if auth is required.
    # But let's see if we get a 500 or 401/403.
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            print(f"Status Code: {response.status_code}")
            print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoint())
