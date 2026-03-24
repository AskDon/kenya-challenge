"""
Test Challenge Reordering Feature
Tests for the new challenge reorder functionality in the Admin panel
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestChallengeReorder:
    """Tests for challenge reordering feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sabrina@kenyaeducationfund.org",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_token = login_resp.json()["token"]
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
        
        # Get initial challenge order
        resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        assert resp.status_code == 200
        self.initial_challenges = resp.json()
        self.initial_order = [c["id"] for c in self.initial_challenges]
        yield
        
        # Teardown: Restore original order
        requests.post(f"{BASE_URL}/api/challenges/reorder", 
                     headers=self.admin_headers,
                     json={"ordered_ids": self.initial_order})
    
    def test_get_challenges_all_sorted_by_display_order(self):
        """GET /api/challenges/all returns challenges sorted by display_order"""
        resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        assert resp.status_code == 200
        
        challenges = resp.json()
        assert len(challenges) >= 1, "Should have at least one challenge"
        
        # Verify sorted by display_order
        display_orders = [c.get("display_order", 0) for c in challenges]
        assert display_orders == sorted(display_orders), "Challenges should be sorted by display_order"
        
        # Verify each challenge has display_order field
        for c in challenges:
            assert "display_order" in c, f"Challenge {c['name']} missing display_order field"
    
    def test_get_challenges_public_sorted_by_display_order(self):
        """GET /api/challenges (public) returns active challenges sorted by display_order"""
        resp = requests.get(f"{BASE_URL}/api/challenges")
        assert resp.status_code == 200
        
        challenges = resp.json()
        assert len(challenges) >= 1, "Should have at least one active challenge"
        
        # Verify sorted by display_order
        display_orders = [c.get("display_order", 0) for c in challenges]
        assert display_orders == sorted(display_orders), "Public challenges should be sorted by display_order"
        
        # Verify all returned challenges are active
        for c in challenges:
            assert c.get("is_active", True) != False, f"Challenge {c['name']} should be active"
    
    def test_reorder_challenges_success(self):
        """POST /api/challenges/reorder successfully updates display_order"""
        # Get current challenges
        resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        assert resp.status_code == 200
        challenges = resp.json()
        
        if len(challenges) < 2:
            pytest.skip("Need at least 2 challenges to test reordering")
        
        # Reverse the order
        original_ids = [c["id"] for c in challenges]
        reversed_ids = original_ids[::-1]
        
        # Call reorder endpoint
        reorder_resp = requests.post(f"{BASE_URL}/api/challenges/reorder",
                                     headers=self.admin_headers,
                                     json={"ordered_ids": reversed_ids})
        assert reorder_resp.status_code == 200
        assert reorder_resp.json().get("message") == "Challenges reordered"
        
        # Verify order changed
        verify_resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        assert verify_resp.status_code == 200
        new_challenges = verify_resp.json()
        new_ids = [c["id"] for c in new_challenges]
        
        assert new_ids == reversed_ids, "Challenge order should be reversed"
        
        # Verify display_order values are sequential
        for i, c in enumerate(new_challenges):
            assert c["display_order"] == i + 1, f"Challenge {c['name']} should have display_order {i+1}"
    
    def test_reorder_challenges_empty_ids_fails(self):
        """POST /api/challenges/reorder with empty ordered_ids returns 400"""
        resp = requests.post(f"{BASE_URL}/api/challenges/reorder",
                            headers=self.admin_headers,
                            json={"ordered_ids": []})
        assert resp.status_code == 400
        assert "ordered_ids required" in resp.json().get("detail", "")
    
    def test_reorder_challenges_requires_admin(self):
        """POST /api/challenges/reorder requires admin authentication"""
        # Test without auth
        resp = requests.post(f"{BASE_URL}/api/challenges/reorder",
                            json={"ordered_ids": ["test-id"]})
        assert resp.status_code == 401
        
        # Test with walker auth
        walker_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@example.com",
            "password": "walker123"
        })
        if walker_login.status_code == 200:
            walker_token = walker_login.json()["token"]
            resp = requests.post(f"{BASE_URL}/api/challenges/reorder",
                                headers={"Authorization": f"Bearer {walker_token}"},
                                json={"ordered_ids": ["test-id"]})
            assert resp.status_code == 403, "Walker should not be able to reorder challenges"
    
    def test_get_challenges_all_requires_admin(self):
        """GET /api/challenges/all requires admin authentication"""
        # Test without auth
        resp = requests.get(f"{BASE_URL}/api/challenges/all")
        assert resp.status_code == 401
        
        # Test with walker auth
        walker_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@example.com",
            "password": "walker123"
        })
        if walker_login.status_code == 200:
            walker_token = walker_login.json()["token"]
            resp = requests.get(f"{BASE_URL}/api/challenges/all",
                               headers={"Authorization": f"Bearer {walker_token}"})
            assert resp.status_code == 403, "Walker should not access /challenges/all"
    
    def test_move_challenge_up(self):
        """Test moving a challenge up one position"""
        resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        challenges = resp.json()
        
        if len(challenges) < 2:
            pytest.skip("Need at least 2 challenges")
        
        # Move second challenge to first position
        original_ids = [c["id"] for c in challenges]
        new_ids = original_ids.copy()
        new_ids[0], new_ids[1] = new_ids[1], new_ids[0]  # Swap first two
        
        reorder_resp = requests.post(f"{BASE_URL}/api/challenges/reorder",
                                     headers=self.admin_headers,
                                     json={"ordered_ids": new_ids})
        assert reorder_resp.status_code == 200
        
        # Verify
        verify_resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        new_challenges = verify_resp.json()
        assert new_challenges[0]["id"] == original_ids[1], "Second challenge should now be first"
        assert new_challenges[1]["id"] == original_ids[0], "First challenge should now be second"
    
    def test_move_challenge_down(self):
        """Test moving a challenge down one position"""
        resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        challenges = resp.json()
        
        if len(challenges) < 2:
            pytest.skip("Need at least 2 challenges")
        
        # Move first challenge to second position
        original_ids = [c["id"] for c in challenges]
        new_ids = original_ids.copy()
        new_ids[0], new_ids[1] = new_ids[1], new_ids[0]  # Swap first two
        
        reorder_resp = requests.post(f"{BASE_URL}/api/challenges/reorder",
                                     headers=self.admin_headers,
                                     json={"ordered_ids": new_ids})
        assert reorder_resp.status_code == 200
        
        # Verify
        verify_resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        new_challenges = verify_resp.json()
        assert new_challenges[0]["id"] == original_ids[1]
        assert new_challenges[1]["id"] == original_ids[0]
    
    def test_display_order_shown_in_challenge_data(self):
        """Verify display_order is included in challenge response data"""
        resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        assert resp.status_code == 200
        challenges = resp.json()
        
        for c in challenges:
            assert "display_order" in c, f"Challenge {c['name']} should have display_order"
            assert isinstance(c["display_order"], int), "display_order should be an integer"
            assert c["display_order"] >= 1, "display_order should be >= 1"


class TestChallengeCreateWithDisplayOrder:
    """Tests for auto-incrementing display_order on challenge creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sabrina@kenyaeducationfund.org",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        self.admin_token = login_resp.json()["token"]
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
        self.created_challenge_id = None
        yield
        
        # Teardown: Delete test challenge if created
        if self.created_challenge_id:
            requests.delete(f"{BASE_URL}/api/challenges/{self.created_challenge_id}",
                          headers=self.admin_headers)
    
    def test_new_challenge_gets_auto_display_order(self):
        """POST /api/challenges creates new challenge with auto-incrementing display_order"""
        # Get current max display_order
        resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=self.admin_headers)
        challenges = resp.json()
        max_order = max([c.get("display_order", 0) for c in challenges]) if challenges else 0
        
        # Create new challenge
        new_challenge = {
            "name": f"TEST_AutoOrder_Challenge_{max_order + 1}",
            "description": "This is a test challenge to verify auto-incrementing display_order. It should get the next available order number automatically.",
            "total_distance_km": 50,
            "milestones": [],
            "is_active": True
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/challenges",
                                   headers=self.admin_headers,
                                   json=new_challenge)
        assert create_resp.status_code == 200, f"Failed to create challenge: {create_resp.text}"
        
        created = create_resp.json()
        self.created_challenge_id = created["id"]
        
        # Verify display_order is auto-incremented
        assert "display_order" in created, "Created challenge should have display_order"
        assert created["display_order"] == max_order + 1, f"Expected display_order {max_order + 1}, got {created['display_order']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
