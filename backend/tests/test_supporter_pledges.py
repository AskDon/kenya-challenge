"""
Tests for Supporter Signup, Pledges, and Supporter Dashboard functionality
This covers:
- Public fundraising page API
- Supporter signup with pledge creation
- Login and pledge creation for existing supporters
- Supporter dashboard API
- Pledge listing for walkers
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = f"TEST_{int(time.time())}"


class TestFundraisingPageAPI:
    """Tests for the public fundraising page endpoint"""

    def test_fundraising_page_loads_for_valid_walker(self):
        """GET /api/fundraising/{walker_id} returns walker data, challenge info, and pledges"""
        response = requests.get(f"{BASE_URL}/api/fundraising/user-john")
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields exist
        assert "walker" in data
        assert "challenge" in data
        assert "total_km" in data
        assert "total_steps" in data
        assert "total_raised" in data
        assert "pledges" in data
        
        # Verify walker data
        assert data["walker"]["id"] == "user-john"
        assert data["walker"]["display_name"] == "JohnnySteps"
        
        # Verify challenge data
        assert data["challenge"]["id"] == "ch-naivasha"
        assert data["challenge"]["name"] == "Nairobi to Naivasha"
        assert data["challenge"]["total_distance_km"] == 100

    def test_fundraising_page_returns_404_for_invalid_walker(self):
        """GET /api/fundraising/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/fundraising/invalid-walker-id")
        assert response.status_code == 404


class TestSupporterSignup:
    """Tests for supporter signup with pledge creation"""

    def test_supporter_signup_creates_user_and_pledge(self):
        """POST /api/supporters/signup creates supporter account with role='supporter' and pledge"""
        email = f"{TEST_PREFIX}_supporter@test.com"
        payload = {
            "full_name": "Test Supporter Signup",
            "email": email,
            "password": "test1234",
            "walker_id": "user-john",
            "pledge_type": "total",
            "pledge_total": 75.0
        }
        
        response = requests.post(f"{BASE_URL}/api/supporters/signup", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify token is returned
        assert "token" in data
        assert len(data["token"]) > 0
        
        # Verify user created with role='supporter'
        assert "user" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["full_name"] == "Test Supporter Signup"
        assert data["user"]["role"] == "supporter"
        
        # Verify pledge was created
        assert "pledge" in data
        assert data["pledge"]["walker_id"] == "user-john"
        assert data["pledge"]["pledge_type"] == "total"
        assert data["pledge"]["pledge_total"] == 75.0
        assert data["pledge"]["supporter_user_id"] == data["user"]["id"]
        assert data["pledge"]["status"] == "active"

    def test_supporter_signup_with_per_km_pledge(self):
        """POST /api/supporters/signup with per_km pledge type"""
        email = f"{TEST_PREFIX}_supporter_perkm@test.com"
        payload = {
            "full_name": "Test Supporter Per KM",
            "email": email,
            "password": "test1234",
            "walker_id": "user-mary",
            "pledge_type": "per_km",
            "pledge_per_km": 1.50
        }
        
        response = requests.post(f"{BASE_URL}/api/supporters/signup", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["user"]["role"] == "supporter"
        assert data["pledge"]["pledge_type"] == "per_km"
        assert data["pledge"]["pledge_per_km"] == 1.50

    def test_supporter_signup_rejects_duplicate_email(self):
        """POST /api/supporters/signup rejects already registered email"""
        # First signup
        email = f"{TEST_PREFIX}_supporter_dup@test.com"
        payload = {
            "full_name": "First Signup",
            "email": email,
            "password": "test1234",
            "walker_id": "user-john",
            "pledge_type": "total",
            "pledge_total": 25.0
        }
        
        response1 = requests.post(f"{BASE_URL}/api/supporters/signup", json=payload)
        assert response1.status_code == 200
        
        # Second signup with same email should fail
        payload["full_name"] = "Second Signup"
        response2 = requests.post(f"{BASE_URL}/api/supporters/signup", json=payload)
        assert response2.status_code == 400
        assert "already registered" in response2.json()["detail"].lower()


class TestPledgeCreation:
    """Tests for creating pledges for authenticated supporters"""

    def test_create_pledge_for_logged_in_user(self):
        """POST /api/pledges/{walker_id} creates pledge with supporter_user_id"""
        # First create a supporter
        email = f"{TEST_PREFIX}_pledge_creator@test.com"
        signup_res = requests.post(f"{BASE_URL}/api/supporters/signup", json={
            "full_name": "Pledge Creator",
            "email": email,
            "password": "test1234",
            "walker_id": "user-john",
            "pledge_type": "total",
            "pledge_total": 10.0
        })
        token = signup_res.json()["token"]
        
        # Create another pledge for a different walker
        pledge_res = requests.post(
            f"{BASE_URL}/api/pledges/user-mary",
            json={
                "pledge_type": "total",
                "pledge_total": 100.0
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert pledge_res.status_code == 200
        data = pledge_res.json()
        assert data["walker_id"] == "user-mary"
        assert data["pledge_total"] == 100.0
        assert data["supporter_user_id"] is not None

    def test_create_pledge_for_invalid_walker(self):
        """POST /api/pledges/{invalid_walker_id} returns 404"""
        # Login as existing supporter
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        token = login_res.json()["token"]
        
        response = requests.post(
            f"{BASE_URL}/api/pledges/invalid-walker",
            json={"pledge_type": "total", "pledge_total": 50.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404


class TestSupporterDashboard:
    """Tests for supporter dashboard API"""

    def test_supporter_dashboard_returns_pledges_with_walker_info(self):
        """GET /api/supporters/dashboard returns pledges with walker and challenge info"""
        # Login as existing supporter
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        # Get dashboard
        dashboard_res = requests.get(
            f"{BASE_URL}/api/supporters/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert dashboard_res.status_code == 200
        data = dashboard_res.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            pledge = data[0]
            # Verify pledge structure
            assert "id" in pledge
            assert "walker_id" in pledge
            assert "pledge_type" in pledge
            assert "status" in pledge
            
            # Verify walker info is included
            assert "walker" in pledge
            assert "walker_total_km" in pledge
            assert "walker_progress_pct" in pledge
            assert "calculated_amount" in pledge
            
            # Verify walker data
            if pledge["walker"]:
                assert "display_name" in pledge["walker"] or "full_name" in pledge["walker"]

    def test_supporter_dashboard_requires_auth(self):
        """GET /api/supporters/dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/supporters/dashboard")
        assert response.status_code == 401


class TestPledgeListing:
    """Tests for listing pledges for a walker"""

    def test_list_pledges_for_walker(self):
        """GET /api/pledges/{walker_id} returns all pledges for that walker"""
        response = requests.get(f"{BASE_URL}/api/pledges/user-john")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify pledge structure
        for pledge in data:
            assert pledge["walker_id"] == "user-john"
            assert "pledge_type" in pledge
            assert "status" in pledge
            # Verify supporter info is included if supporter exists
            if pledge.get("supporter_user_id"):
                assert "supporter" in pledge


class TestLoginRedirect:
    """Tests for login API behavior for supporters"""

    def test_login_returns_supporter_role(self):
        """POST /api/auth/login returns user with role='supporter'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "supporter"

    def test_login_returns_walker_role(self):
        """POST /api/auth/login returns user with role='walker'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@example.com",
            "password": "walker123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "walker"


# Pytest fixtures
@pytest.fixture(scope="module", autouse=True)
def check_base_url():
    """Ensure BASE_URL is configured"""
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL not set")
