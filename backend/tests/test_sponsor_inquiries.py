"""
Backend API tests for Sponsor Inquiries and Enhanced Challenge features
Tests: POST /api/sponsor-inquiries (public), GET/PUT/DELETE sponsor-inquiries (admin)
Tests: Challenge is_active toggle, unique name validation, description limits
Tests: Route map uploads
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test Data
ADMIN_EMAIL = "sabrina@kenyaeducationfund.org"
ADMIN_PASSWORD = "admin123"
WALKER_EMAIL = "john@example.com"
WALKER_PASSWORD = "walker123"


@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="session")
def walker_token(api_client):
    """Get walker authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": WALKER_EMAIL,
        "password": WALKER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Walker authentication failed")


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture
def walker_client(api_client, walker_token):
    """Session with walker auth header"""
    api_client.headers.update({"Authorization": f"Bearer {walker_token}"})
    return api_client


class TestSponsorInquiriesPublic:
    """Sponsor Inquiry - Public endpoint tests"""
    
    def test_create_sponsor_inquiry_success(self, api_client):
        """POST /api/sponsor-inquiries - creates new inquiry (public endpoint)"""
        # Remove auth header if present for public test
        api_client.headers.pop("Authorization", None)
        
        payload = {
            "company_name": "TEST_Company_Public",
            "contact_name": "John Doe",
            "email": "john@testcompany.com",
            "phone": "+1-555-123-4567",
            "interested_level": "Gold Sponsor",
            "message": "We are interested in sponsoring the Kenya Challenge."
        }
        
        response = api_client.post(f"{BASE_URL}/api/sponsor-inquiries", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["company_name"] == payload["company_name"]
        assert data["contact_name"] == payload["contact_name"]
        assert data["email"] == payload["email"]
        assert data["status"] == "new"  # Default status should be 'new'
        assert "created_at" in data
    
    def test_create_inquiry_minimal_fields(self, api_client):
        """POST /api/sponsor-inquiries - creates with minimal required fields"""
        api_client.headers.pop("Authorization", None)
        
        payload = {
            "company_name": "TEST_MinimalCorp",
            "contact_name": "Jane Smith",
            "email": "jane@minimal.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/sponsor-inquiries", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == payload["company_name"]
        assert data["phone"] == ""  # Optional field defaults to empty
        assert data["status"] == "new"


class TestSponsorInquiriesAdmin:
    """Sponsor Inquiry - Admin endpoint tests"""
    
    def test_list_inquiries_requires_admin(self, api_client):
        """GET /api/sponsor-inquiries - returns 401 without auth"""
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/sponsor-inquiries")
        assert response.status_code == 401
    
    def test_list_inquiries_non_admin_forbidden(self, walker_client):
        """GET /api/sponsor-inquiries - returns 403 for non-admin"""
        response = walker_client.get(f"{BASE_URL}/api/sponsor-inquiries")
        assert response.status_code == 403
    
    def test_list_inquiries_admin_success(self, admin_client):
        """GET /api/sponsor-inquiries - lists all inquiries for admin"""
        response = admin_client.get(f"{BASE_URL}/api/sponsor-inquiries")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least our test inquiries
        assert len(data) >= 1
    
    def test_update_inquiry_status_success(self, admin_client):
        """PUT /api/sponsor-inquiries/{id}/status - updates status"""
        # First get list to find an inquiry
        response = admin_client.get(f"{BASE_URL}/api/sponsor-inquiries")
        inquiries = response.json()
        
        if not inquiries:
            pytest.skip("No inquiries to test status update")
        
        inquiry_id = inquiries[0]["id"]
        
        # Update to 'contacted'
        response = admin_client.put(f"{BASE_URL}/api/sponsor-inquiries/{inquiry_id}/status?status=contacted")
        assert response.status_code == 200
        
        # Verify the change
        response = admin_client.get(f"{BASE_URL}/api/sponsor-inquiries")
        updated = next((i for i in response.json() if i["id"] == inquiry_id), None)
        assert updated is not None
        assert updated["status"] == "contacted"
    
    def test_update_status_invalid_value(self, admin_client):
        """PUT /api/sponsor-inquiries/{id}/status - rejects invalid status"""
        response = admin_client.get(f"{BASE_URL}/api/sponsor-inquiries")
        inquiries = response.json()
        
        if not inquiries:
            pytest.skip("No inquiries to test")
        
        inquiry_id = inquiries[0]["id"]
        
        response = admin_client.put(f"{BASE_URL}/api/sponsor-inquiries/{inquiry_id}/status?status=invalid_status")
        assert response.status_code == 400
    
    def test_update_status_nonexistent(self, admin_client):
        """PUT /api/sponsor-inquiries/{nonexistent}/status - returns 404"""
        response = admin_client.put(f"{BASE_URL}/api/sponsor-inquiries/nonexistent-id/status?status=contacted")
        assert response.status_code == 404
    
    def test_delete_inquiry_success(self, admin_client, admin_token):
        """DELETE /api/sponsor-inquiries/{id} - deletes inquiry"""
        # Create a new inquiry to delete (public endpoint - no auth needed)
        import requests
        create_resp = requests.post(f"{BASE_URL}/api/sponsor-inquiries", json={
            "company_name": "TEST_ToDelete",
            "contact_name": "Delete Me",
            "email": "delete@test.com"
        })
        assert create_resp.status_code == 200
        inquiry_id = create_resp.json()["id"]
        
        # Ensure admin_client has auth header
        admin_client.headers["Authorization"] = f"Bearer {admin_token}"
        
        # Delete it
        response = admin_client.delete(f"{BASE_URL}/api/sponsor-inquiries/{inquiry_id}")
        assert response.status_code == 200
        
        # Verify it's gone
        response = admin_client.get(f"{BASE_URL}/api/sponsor-inquiries")
        deleted = next((i for i in response.json() if i["id"] == inquiry_id), None)
        assert deleted is None
    
    def test_delete_inquiry_nonexistent(self, admin_client):
        """DELETE /api/sponsor-inquiries/{nonexistent} - returns 404"""
        response = admin_client.delete(f"{BASE_URL}/api/sponsor-inquiries/nonexistent-id")
        assert response.status_code == 404
    
    def test_delete_inquiry_non_admin_forbidden(self, walker_client):
        """DELETE /api/sponsor-inquiries/{id} - returns 403 for non-admin"""
        response = walker_client.delete(f"{BASE_URL}/api/sponsor-inquiries/any-id")
        assert response.status_code == 403


class TestChallengeIsActive:
    """Challenge is_active toggle tests"""
    
    def test_public_challenges_only_active(self, api_client, admin_client):
        """GET /api/challenges - returns only active challenges"""
        api_client.headers.pop("Authorization", None)
        
        # Get public challenges
        response = api_client.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        challenges = response.json()
        
        # All should be active
        for ch in challenges:
            assert ch.get("is_active") is not False
    
    def test_admin_get_all_challenges(self, admin_client):
        """GET /api/challenges/all - returns all challenges including inactive (admin)"""
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        assert response.status_code == 200
        challenges = response.json()
        assert isinstance(challenges, list)
    
    def test_toggle_challenge_active(self, admin_client, api_client):
        """PUT /api/challenges/{id} - toggles is_active field"""
        # Get all challenges
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        challenges = response.json()
        
        if not challenges:
            pytest.skip("No challenges to test")
        
        challenge = challenges[0]
        challenge_id = challenge["id"]
        original_active = challenge.get("is_active", True)
        
        # Toggle active status
        response = admin_client.put(f"{BASE_URL}/api/challenges/{challenge_id}", json={
            "is_active": not original_active
        })
        assert response.status_code == 200
        
        # Verify change
        response = admin_client.get(f"{BASE_URL}/api/challenges/{challenge_id}")
        updated = response.json()
        assert updated["is_active"] == (not original_active)
        
        # Restore original state
        admin_client.put(f"{BASE_URL}/api/challenges/{challenge_id}", json={
            "is_active": original_active
        })


class TestChallengeValidation:
    """Challenge unique name and description validation tests"""
    
    def test_create_challenge_unique_name_enforced(self, admin_client):
        """POST /api/challenges - rejects duplicate name"""
        # Use an existing challenge name
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        challenges = response.json()
        
        if not challenges:
            pytest.skip("No challenges to test duplicate name")
        
        existing_name = challenges[0]["name"]
        
        payload = {
            "name": existing_name,
            "description": "A" * 60,  # 60 chars to meet minimum
            "total_distance_km": 100
        }
        
        response = admin_client.post(f"{BASE_URL}/api/challenges", json=payload)
        assert response.status_code == 400
        assert "unique" in response.json().get("detail", "").lower()
    
    def test_create_challenge_description_too_short(self, admin_client):
        """POST /api/challenges - rejects description < 50 characters"""
        payload = {
            "name": "TEST_ShortDesc_Challenge",
            "description": "Too short",  # Only ~9 chars
            "total_distance_km": 100
        }
        
        response = admin_client.post(f"{BASE_URL}/api/challenges", json=payload)
        assert response.status_code == 400
        assert "50" in response.json().get("detail", "")
    
    def test_create_challenge_description_too_long(self, admin_client):
        """POST /api/challenges - rejects description > 2000 characters"""
        payload = {
            "name": "TEST_LongDesc_Challenge",
            "description": "A" * 2001,  # Over 2000 chars
            "total_distance_km": 100
        }
        
        response = admin_client.post(f"{BASE_URL}/api/challenges", json=payload)
        assert response.status_code == 400
        assert "2000" in response.json().get("detail", "")
    
    def test_update_challenge_unique_name_enforced(self, admin_client):
        """PUT /api/challenges/{id} - rejects duplicate name on update"""
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        challenges = response.json()
        
        if len(challenges) < 2:
            pytest.skip("Need at least 2 challenges to test unique name on update")
        
        target_id = challenges[0]["id"]
        other_name = challenges[1]["name"]
        
        response = admin_client.put(f"{BASE_URL}/api/challenges/{target_id}", json={
            "name": other_name
        })
        assert response.status_code == 400
        assert "unique" in response.json().get("detail", "").lower()
    
    def test_update_challenge_description_validation(self, admin_client):
        """PUT /api/challenges/{id} - validates description on update"""
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        challenges = response.json()
        
        if not challenges:
            pytest.skip("No challenges to test")
        
        challenge_id = challenges[0]["id"]
        
        # Too short
        response = admin_client.put(f"{BASE_URL}/api/challenges/{challenge_id}", json={
            "description": "Short"
        })
        assert response.status_code == 400


class TestRouteMapUploads:
    """Route map and markers image upload tests"""
    
    def test_upload_route_map_success(self, admin_client):
        """POST /api/challenges/{id}/route-map - uploads route map image"""
        # Get a challenge ID
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        challenges = response.json()
        
        if not challenges:
            pytest.skip("No challenges to test route map upload")
        
        challenge_id = challenges[0]["id"]
        
        # Create a simple test image (1x1 PNG)
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_route.png", png_data, "image/png")}
        
        # Need to use multipart form
        admin_client.headers.pop("Content-Type", None)  # Remove JSON header
        response = admin_client.post(
            f"{BASE_URL}/api/challenges/{challenge_id}/route-map",
            files=files
        )
        admin_client.headers["Content-Type"] = "application/json"  # Restore
        
        assert response.status_code == 200
        data = response.json()
        assert "route_map_url" in data
        assert data["route_map_url"].startswith("/api/uploads/")
    
    def test_upload_route_map_markers_success(self, admin_client):
        """POST /api/challenges/{id}/route-map-markers - uploads markers image"""
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        challenges = response.json()
        
        if not challenges:
            pytest.skip("No challenges to test")
        
        challenge_id = challenges[0]["id"]
        
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_markers.png", png_data, "image/png")}
        
        admin_client.headers.pop("Content-Type", None)
        response = admin_client.post(
            f"{BASE_URL}/api/challenges/{challenge_id}/route-map-markers",
            files=files
        )
        admin_client.headers["Content-Type"] = "application/json"
        
        assert response.status_code == 200
        data = response.json()
        assert "route_map_markers_url" in data
    
    def test_upload_route_map_invalid_file_type(self, admin_client):
        """POST /api/challenges/{id}/route-map - rejects invalid file type"""
        response = admin_client.get(f"{BASE_URL}/api/challenges/all")
        challenges = response.json()
        
        if not challenges:
            pytest.skip("No challenges to test")
        
        challenge_id = challenges[0]["id"]
        
        files = {"file": ("test.txt", b"not an image", "text/plain")}
        
        admin_client.headers.pop("Content-Type", None)
        response = admin_client.post(
            f"{BASE_URL}/api/challenges/{challenge_id}/route-map",
            files=files
        )
        admin_client.headers["Content-Type"] = "application/json"
        
        assert response.status_code == 400
    
    def test_upload_route_map_nonexistent_challenge(self, admin_client):
        """POST /api/challenges/{nonexistent}/route-map - returns 404"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        
        admin_client.headers.pop("Content-Type", None)
        response = admin_client.post(
            f"{BASE_URL}/api/challenges/nonexistent-id/route-map",
            files=files
        )
        admin_client.headers["Content-Type"] = "application/json"
        
        assert response.status_code == 404


class TestChallengeCreateSuccess:
    """Challenge creation with valid data"""
    
    def test_create_challenge_with_active_flag(self, admin_client):
        """POST /api/challenges - creates with is_active flag"""
        import uuid
        unique_name = f"TEST_Active_Challenge_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "name": unique_name,
            "description": "This is a test challenge with more than 50 characters to meet the minimum requirement.",
            "total_distance_km": 50,
            "is_active": True
        }
        
        response = admin_client.post(f"{BASE_URL}/api/challenges", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == unique_name
        assert data["is_active"] == True
        
        # Cleanup - delete the test challenge
        admin_client.delete(f"{BASE_URL}/api/challenges/{data['id']}")


# Cleanup test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_inquiries(api_client, admin_token):
    """Clean up TEST_ prefixed inquiries after test session"""
    yield
    
    api_client.headers["Authorization"] = f"Bearer {admin_token}"
    response = api_client.get(f"{BASE_URL}/api/sponsor-inquiries")
    if response.status_code == 200:
        for inquiry in response.json():
            if inquiry.get("company_name", "").startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/sponsor-inquiries/{inquiry['id']}")
