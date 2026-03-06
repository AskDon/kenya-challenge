"""
Backend tests for Team Features - Social sharing, Teammate signup, Team page enhancements
Tests the new features:
- Team invite endpoint
- Team member removal endpoint
- Team data with leader info, avg_progress_pct, member progress_pct
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestTeamInviteEndpoint:
    """Test GET /api/teams/invite/{invite_code} endpoint"""
    
    def test_get_team_by_valid_invite_code(self):
        """Valid invite code returns team info with members_count"""
        response = requests.get(f"{BASE_URL}/api/teams/invite/KEF2024A")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "KEF Trailblazers"
        assert data["invite_code"] == "KEF2024A"
        assert "members_count" in data
        assert isinstance(data["members_count"], int)
        print(f"✓ Team invite endpoint returns team with {data['members_count']} members")

    def test_get_team_by_invalid_invite_code(self):
        """Invalid invite code returns 404"""
        response = requests.get(f"{BASE_URL}/api/teams/invite/INVALID123")
        assert response.status_code == 404
        print("✓ Invalid invite code returns 404")


class TestTeamMemberRemoval:
    """Test DELETE /api/teams/members/{member_id} endpoint"""
    
    @pytest.fixture
    def leader_token(self):
        """Get auth token for team leader (john)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "john@example.com", "password": "walker123"}
        )
        if response.status_code != 200:
            pytest.skip("Could not login as john")
        return response.json()["token"]
    
    @pytest.fixture
    def member_token(self):
        """Get auth token for team member (mary)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "mary@example.com", "password": "walker123"}
        )
        if response.status_code != 200:
            pytest.skip("Could not login as mary")
        return response.json()["token"]
    
    def test_leader_cannot_remove_self(self, leader_token):
        """Team leader cannot remove themselves"""
        headers = {"Authorization": f"Bearer {leader_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/teams/members/user-john",
            headers=headers
        )
        assert response.status_code == 400
        assert "Cannot remove yourself" in response.json().get("detail", "")
        print("✓ Leader cannot remove self")

    def test_non_leader_cannot_remove_members(self, member_token):
        """Non-leader cannot remove members"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/teams/members/user-john",
            headers=headers
        )
        assert response.status_code == 403
        assert "Only team leader" in response.json().get("detail", "")
        print("✓ Non-leader cannot remove members")

    def test_leader_remove_invalid_member(self, leader_token):
        """Leader cannot remove non-existent member"""
        headers = {"Authorization": f"Bearer {leader_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/teams/members/nonexistent-user",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ Removing non-existent member returns 404")

    def test_remove_member_requires_auth(self):
        """Endpoint requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/teams/members/user-mary")
        assert response.status_code == 401
        print("✓ Remove member requires authentication")


class TestTeamDataEnhancements:
    """Test GET /api/teams/my returns enhanced data with leader info, avg_progress_pct, member progress"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for john (team leader)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "john@example.com", "password": "walker123"}
        )
        if response.status_code != 200:
            pytest.skip("Could not login as john")
        return response.json()["token"]
    
    def test_team_has_leader_info(self, auth_token):
        """Team response includes leader object"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/teams/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "leader" in data
        assert data["leader"]["id"] == data["creator_id"]
        assert "display_name" in data["leader"]
        print(f"✓ Team has leader info: {data['leader']['display_name']}")

    def test_team_has_avg_progress_pct(self, auth_token):
        """Team response includes avg_progress_pct"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/teams/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "avg_progress_pct" in data
        assert isinstance(data["avg_progress_pct"], (int, float))
        assert 0 <= data["avg_progress_pct"] <= 100
        print(f"✓ Team avg_progress_pct: {data['avg_progress_pct']}%")

    def test_members_have_progress_pct(self, auth_token):
        """Each member has progress_pct and is_leader fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/teams/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "members" in data
        assert len(data["members"]) > 0
        
        for member in data["members"]:
            assert "progress_pct" in member
            assert isinstance(member["progress_pct"], (int, float))
            assert "is_leader" in member
            assert "total_km" in member
            assert "total_raised" in member
            print(f"  - {member['display_name']}: {member['progress_pct']}% (leader: {member['is_leader']})")
        
        print("✓ All members have progress_pct and is_leader")

    def test_members_have_challenge_info(self, auth_token):
        """Each member has their challenge info"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/teams/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        for member in data["members"]:
            if member.get("challenge_id"):
                assert "challenge" in member
                assert member["challenge"] is not None
                assert "name" in member["challenge"]
                print(f"  - {member['display_name']} on challenge: {member['challenge']['name']}")
        
        print("✓ Members have challenge info")


class TestTeammateSignupFlow:
    """Test teammate signup endpoints - join team via invite code"""
    
    def test_team_invite_returns_team_info(self):
        """GET /api/teams/invite/{code} returns team info for signup page"""
        response = requests.get(f"{BASE_URL}/api/teams/invite/KEF2024A")
        assert response.status_code == 200
        data = response.json()
        
        # Data needed for teammate signup page
        assert "id" in data
        assert "name" in data
        assert "tagline" in data
        assert "members_count" in data
        print(f"✓ Team invite returns: {data['name']} ({data['members_count']} members)")

    def test_signup_and_join_team_flow(self):
        """New user can sign up and join team via invite code"""
        # Step 1: Create new user
        unique_email = f"TEST_teammate_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "full_name": "Test Teammate",
                "email": unique_email,
                "password": "test123456",
                "display_name": "TestTeammate"
            }
        )
        assert signup_response.status_code == 200
        token = signup_response.json()["token"]
        print(f"✓ Step 1: User signed up as {unique_email}")
        
        # Step 2: Join team via invite code
        headers = {"Authorization": f"Bearer {token}"}
        join_response = requests.post(
            f"{BASE_URL}/api/teams/join/KEF2024A",
            headers=headers
        )
        assert join_response.status_code == 200
        assert "team_id" in join_response.json()
        print("✓ Step 2: Joined team via invite code")
        
        # Verify user is in team
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["team_id"] is not None
        print("✓ Step 3: User is now in team")

    def test_existing_user_login_and_join_team(self):
        """Existing user can login and join team"""
        # Create a test user first
        unique_email = f"TEST_existing_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "full_name": "Existing User",
                "email": unique_email,
                "password": "test123456"
            }
        )
        assert signup_response.status_code == 200
        
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": unique_email, "password": "test123456"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Join team
        headers = {"Authorization": f"Bearer {token}"}
        join_response = requests.post(
            f"{BASE_URL}/api/teams/join/KEF2024A",
            headers=headers
        )
        assert join_response.status_code == 200
        print("✓ Existing user can login and join team")


class TestChallengeAndWalkerTypeEndpoints:
    """Test endpoints needed for teammate setup (Part 2)"""
    
    def test_get_challenges(self):
        """GET /api/challenges returns available challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        for ch in data:
            assert "id" in ch
            assert "name" in ch
            assert "total_distance_km" in ch
        print(f"✓ {len(data)} challenges available")

    def test_get_walker_types(self):
        """GET /api/walker-types returns pricing levels"""
        response = requests.get(f"{BASE_URL}/api/walker-types")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        for wt in data:
            assert "id" in wt
            assert "name" in wt
            assert "cost_usd" in wt
        print(f"✓ {len(data)} walker types: {[wt['name'] for wt in data]}")

    def test_get_achievement_levels(self):
        """GET /api/achievement-levels returns achievement table"""
        response = requests.get(f"{BASE_URL}/api/achievement-levels")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        for al in data:
            assert "total_amount_usd" in al
            assert "achievement" in al
            assert "swag" in al
        print(f"✓ {len(data)} achievement levels")


class TestFundraisingEndpoint:
    """Test fundraising page data for share buttons"""
    
    def test_fundraising_page_returns_walker_data(self):
        """GET /api/fundraising/{walker_id} returns data for share buttons"""
        response = requests.get(f"{BASE_URL}/api/fundraising/user-john")
        assert response.status_code == 200
        data = response.json()
        
        # Data needed for sharing
        assert "walker" in data
        assert "display_name" in data["walker"] or "full_name" in data["walker"]
        assert "challenge" in data
        if data["challenge"]:
            assert "name" in data["challenge"]
            assert "total_distance_km" in data["challenge"]
        
        print(f"✓ Fundraising data for {data['walker'].get('display_name', data['walker']['full_name'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
