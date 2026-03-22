"""
Test file for Kenya Challenge Punch List Features
Tests: Admin stats by challenge, user deletion, profile picture upload, combined pledges
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://walking-kef.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "sabrina@kenyaeducationfund.org"
ADMIN_PASSWORD = "admin123"
WALKER_EMAIL = "john@example.com"
WALKER_PASSWORD = "walker123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def walker_token():
    """Get walker authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": WALKER_EMAIL,
        "password": WALKER_PASSWORD
    })
    assert response.status_code == 200, f"Walker login failed: {response.text}"
    return response.json()["token"]


class TestAdminStatsByChallenge:
    """Tests for /api/admin/stats/by-challenge endpoint"""
    
    def test_stats_by_challenge_returns_data(self, admin_token):
        """Admin stats by challenge endpoint returns challenge stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/by-challenge",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify structure of each challenge stat
        for stat in data:
            assert "challenge_id" in stat
            assert "challenge_name" in stat
            assert "is_active" in stat
            assert "walkers" in stat
            assert "teams" in stat
            assert "pledged" in stat
            assert isinstance(stat["walkers"], int)
            assert isinstance(stat["teams"], int)
        print(f"Stats by challenge returned {len(data)} challenges")
    
    def test_stats_by_challenge_requires_admin(self, walker_token):
        """Stats by challenge endpoint requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/by-challenge",
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403
        print("Non-admin correctly rejected from stats by challenge")
    
    def test_stats_by_challenge_requires_auth(self):
        """Stats by challenge endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats/by-challenge")
        assert response.status_code == 401
        print("Unauthenticated request correctly rejected")


class TestAdminUserDeletion:
    """Tests for /api/admin/users/{user_id} DELETE endpoint"""
    
    def test_delete_user_creates_and_deletes(self, admin_token):
        """Admin can create and delete a test user"""
        # Create a test user first
        test_email = f"test_delete_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": test_email,
            "password": "testpass123",
            "full_name": "TEST_DeleteUser"
        })
        assert signup_response.status_code == 200
        test_user_id = signup_response.json()["user"]["id"]
        print(f"Created test user: {test_user_id}")
        
        # Delete the user
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/users/{test_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json().get("message", "").lower()
        print(f"Successfully deleted user: {test_user_id}")
        
        # Verify user is gone
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        user_ids = [u["id"] for u in users_response.json()]
        assert test_user_id not in user_ids
        print("Verified user no longer exists")
    
    def test_delete_user_cannot_delete_admin(self, admin_token):
        """Admin cannot delete other admin accounts"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/user-admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        print("Correctly prevented admin deletion")
    
    def test_delete_user_requires_admin(self, walker_token):
        """User deletion requires admin role"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/user-john",
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403
        print("Non-admin correctly rejected from user deletion")
    
    def test_delete_nonexistent_user(self, admin_token):
        """Deleting nonexistent user returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/nonexistent-user-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("Nonexistent user deletion correctly returns 404")


class TestProfilePictureUpload:
    """Tests for /api/auth/profile-picture endpoint"""
    
    def test_profile_picture_requires_auth(self):
        """Profile picture upload requires authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/profile-picture")
        assert response.status_code == 401
        print("Unauthenticated upload correctly rejected")
    
    def test_profile_picture_requires_image(self, walker_token):
        """Profile picture upload requires image file"""
        # Send non-image file
        files = {"file": ("test.txt", b"not an image", "text/plain")}
        response = requests.post(
            f"{BASE_URL}/api/auth/profile-picture",
            headers={"Authorization": f"Bearer {walker_token}"},
            files=files
        )
        assert response.status_code == 400
        assert "image" in response.json().get("detail", "").lower()
        print("Non-image file correctly rejected")
    
    def test_profile_picture_upload_success(self, walker_token):
        """Profile picture upload works with valid image"""
        # Create a minimal valid PNG (1x1 pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/auth/profile-picture",
            headers={"Authorization": f"Bearer {walker_token}"},
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert "profile_picture_url" in data
        assert data["profile_picture_url"].startswith("/api/uploads/")
        print(f"Profile picture uploaded: {data['profile_picture_url']}")


class TestCombinedPledges:
    """Tests for combined pledge type support"""
    
    def test_create_combined_pledge(self, walker_token):
        """Create a pledge with both total and per_km amounts"""
        response = requests.post(
            f"{BASE_URL}/api/pledges/user-john",
            headers={"Authorization": f"Bearer {walker_token}"},
            json={
                "pledge_type": "combined",
                "pledge_per_km": 0.50,
                "pledge_total": 25.00
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["pledge_type"] == "combined"
        assert data["pledge_per_km"] == 0.50
        assert data["pledge_total"] == 25.00
        # Combined amount should be total + (per_km * route_km)
        # Route is 100km, so 25 + (0.50 * 100) = 75
        assert data["calculated_amount"] == 75.00
        print(f"Combined pledge created with calculated amount: ${data['calculated_amount']}")
    
    def test_create_total_only_pledge(self, walker_token):
        """Create a pledge with only total amount"""
        response = requests.post(
            f"{BASE_URL}/api/pledges/user-john",
            headers={"Authorization": f"Bearer {walker_token}"},
            json={
                "pledge_type": "total",
                "pledge_total": 50.00
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["pledge_type"] == "total"
        assert data["pledge_total"] == 50.00
        print(f"Total-only pledge created: ${data['pledge_total']}")
    
    def test_create_per_km_only_pledge(self, walker_token):
        """Create a pledge with only per_km amount"""
        response = requests.post(
            f"{BASE_URL}/api/pledges/user-john",
            headers={"Authorization": f"Bearer {walker_token}"},
            json={
                "pledge_type": "per_km",
                "pledge_per_km": 1.00
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["pledge_type"] == "per_km"
        assert data["pledge_per_km"] == 1.00
        print(f"Per-km pledge created: ${data['pledge_per_km']}/km")


class TestLeaderboardWalkerLinks:
    """Tests for leaderboard walker data (for clickable links)"""
    
    def test_distance_leaderboard_has_user_ids(self):
        """Distance leaderboard returns user_id for linking"""
        response = requests.get(f"{BASE_URL}/api/leaderboards/distance")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for entry in data:
            assert "user_id" in entry
            assert "display_name" in entry
            assert "total_km" in entry
        print(f"Distance leaderboard has {len(data)} entries with user_ids")
    
    def test_raised_leaderboard_has_user_ids(self):
        """Raised leaderboard returns user_id for linking"""
        response = requests.get(f"{BASE_URL}/api/leaderboards/raised")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for entry in data:
            assert "user_id" in entry
            assert "display_name" in entry
            assert "total_raised" in entry
        print(f"Raised leaderboard has {len(data)} entries with user_ids")


class TestFundraisingPage:
    """Tests for fundraising page data"""
    
    def test_fundraising_page_returns_data(self):
        """Fundraising page endpoint returns walker data"""
        response = requests.get(f"{BASE_URL}/api/fundraising/user-john")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "walker" in data
        assert "challenge" in data
        assert "total_km" in data
        assert "total_raised" in data
        assert "pledges" in data
        
        # Verify walker info
        assert data["walker"]["display_name"] == "JohnnySteps"
        print(f"Fundraising page for user-john: {data['total_km']}km, ${data['total_raised']} raised")
    
    def test_fundraising_page_nonexistent_walker(self):
        """Fundraising page returns 404 for nonexistent walker"""
        response = requests.get(f"{BASE_URL}/api/fundraising/nonexistent-user")
        assert response.status_code == 404
        print("Nonexistent walker correctly returns 404")


class TestTeamInviteLink:
    """Tests for team invite functionality"""
    
    def test_team_has_invite_code(self, walker_token):
        """Team data includes invite code"""
        response = requests.get(
            f"{BASE_URL}/api/teams/my",
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data:  # Walker is in a team
            assert "invite_code" in data
            assert len(data["invite_code"]) > 0
            print(f"Team invite code: {data['invite_code']}")
        else:
            print("Walker not in a team - skipping invite code check")
    
    def test_team_invite_lookup(self):
        """Team can be looked up by invite code"""
        # First get a valid invite code
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WALKER_EMAIL,
            "password": WALKER_PASSWORD
        })
        token = login_response.json()["token"]
        
        team_response = requests.get(
            f"{BASE_URL}/api/teams/my",
            headers={"Authorization": f"Bearer {token}"}
        )
        team_data = team_response.json()
        
        if team_data and "invite_code" in team_data:
            invite_code = team_data["invite_code"]
            
            # Look up team by invite code
            lookup_response = requests.get(f"{BASE_URL}/api/teams/invite/{invite_code}")
            assert lookup_response.status_code == 200
            lookup_data = lookup_response.json()
            assert lookup_data["name"] == team_data["name"]
            print(f"Team lookup by invite code successful: {lookup_data['name']}")
        else:
            print("No team with invite code to test")


class TestOnboardingTeamSearch:
    """Tests for team search functionality (used in onboarding)"""
    
    def test_team_search_returns_results(self):
        """Team search returns matching teams"""
        response = requests.get(f"{BASE_URL}/api/teams/search?q=KEF")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should find KEF Trailblazers
        team_names = [t["name"] for t in data]
        assert any("KEF" in name for name in team_names)
        print(f"Team search found {len(data)} teams matching 'KEF'")
    
    def test_team_search_empty_query(self):
        """Team search with empty query returns all teams"""
        response = requests.get(f"{BASE_URL}/api/teams/search?q=")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Empty search returned {len(data)} teams")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
