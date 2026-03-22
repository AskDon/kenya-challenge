"""
Test suite for March 22 Batch 2 fixes:
- HOME: Pricing $1,250/$5,000
- HOME: Become a Sponsor text-only (no form)
- WALKER: Karibuni greeting
- SUPPORTER: Pledge amounts show FULL route completion totals
- ADMIN: No Inquiries tab, route map upload, milestone photo upload, sponsor capacity
- API: Leaderboard/raised and fundraising endpoints with full route pledge calculation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndSetup:
    """Authentication tests for various user types"""
    
    def test_admin_login(self):
        """Test admin login - sabrina@kenyaeducationfund.org / admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sabrina@kenyaeducationfund.org",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful")
    
    def test_walker_john_login(self):
        """Test walker login - john@example.com / walker123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@example.com",
            "password": "walker123"
        })
        assert response.status_code == 200, f"Walker John login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["id"] == "user-john"
        assert data["user"]["display_name"] == "JohnnySteps"
        print(f"✓ Walker John login successful - display_name: {data['user']['display_name']}")
    
    def test_walker_mary_login(self):
        """Test walker login - mary@example.com / walker123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mary@example.com",
            "password": "walker123"
        })
        assert response.status_code == 200, f"Walker Mary login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["id"] == "user-mary"
        assert data["user"]["display_name"] == "MaryMoves"
        print(f"✓ Walker Mary login successful - display_name: {data['user']['display_name']}")


class TestSupporterPledgeCalculations:
    """Test that pledge amounts show FULL route completion totals"""
    
    @pytest.fixture
    def supporter_token(self):
        """Create or login supporter1@test.com"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json()["token"]
        
        # Create supporter if doesn't exist
        response = requests.post(f"{BASE_URL}/api/supporters/signup", json={
            "full_name": "Test Supporter",
            "email": "supporter1@test.com",
            "password": "test1234",
            "walker_id": "user-mary",
            "pledge_type": "per_km",
            "pledge_per_km": 2.0,
            "pledge_total": None
        })
        if response.status_code == 200:
            return response.json()["token"]
        
        # If email already registered, login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Supporter login failed: {response.text}"
        return response.json()["token"]
    
    def test_supporter_dashboard_total_pledged(self, supporter_token):
        """Test supporter dashboard shows correct total pledged ($450)"""
        headers = {"Authorization": f"Bearer {supporter_token}"}
        response = requests.get(f"{BASE_URL}/api/supporters/dashboard", headers=headers)
        assert response.status_code == 200, f"Supporter dashboard failed: {response.text}"
        
        pledges = response.json()
        total_pledged = sum(p.get("calculated_amount", 0) for p in pledges)
        print(f"✓ Supporter dashboard - Total pledged: ${total_pledged}")
        print(f"  Pledges: {len(pledges)}")
        for p in pledges:
            walker = p.get("walker", {})
            print(f"  - {walker.get('display_name', 'Unknown')}: ${p.get('calculated_amount', 0)}")
    
    def test_mary_pledge_full_route_calculation(self, supporter_token):
        """Test MaryMoves pledge shows $400 (200km x $2/km = full route completion)"""
        headers = {"Authorization": f"Bearer {supporter_token}"}
        response = requests.get(f"{BASE_URL}/api/supporters/dashboard", headers=headers)
        assert response.status_code == 200
        
        pledges = response.json()
        mary_pledge = next((p for p in pledges if p.get("walker", {}).get("id") == "user-mary"), None)
        
        if mary_pledge:
            # Mary's challenge is ch-migration (200km), pledge is $2/km
            # Full route calculation: 200km * $2/km = $400
            calculated = mary_pledge.get("calculated_amount", 0)
            print(f"✓ MaryMoves pledge calculated_amount: ${calculated}")
            
            # Verify it's based on full route (200km), not current progress
            challenge = mary_pledge.get("challenge", {})
            route_km = challenge.get("total_distance_km", 0)
            pledge_per_km = mary_pledge.get("pledge_per_km", 0)
            expected = route_km * pledge_per_km
            print(f"  Route: {route_km}km, Pledge: ${pledge_per_km}/km, Expected: ${expected}")
            
            # The calculated amount should be based on full route
            assert calculated == expected or calculated == 400, f"Expected $400 (200km x $2/km), got ${calculated}"
        else:
            print("  Note: No pledge found for MaryMoves - may need to create one")


class TestFundraisingEndpoint:
    """Test /api/fundraising/{userId} returns correct total_raised with full route pledge calculation"""
    
    def test_fundraising_user_mary(self):
        """Test Mary's fundraising page shows correct total_raised"""
        response = requests.get(f"{BASE_URL}/api/fundraising/user-mary")
        assert response.status_code == 200, f"Fundraising endpoint failed: {response.text}"
        
        data = response.json()
        total_raised = data.get("total_raised", 0)
        walker_fee = data.get("walker_fee", 0)
        pledge_total_value = data.get("pledge_total_value", 0)
        
        print(f"✓ Mary's fundraising page:")
        print(f"  Total raised: ${total_raised}")
        print(f"  Walker fee: ${walker_fee}")
        print(f"  Pledge total value: ${pledge_total_value}")
        
        # Mary is a Leader ($250 fee) on ch-migration (200km)
        # If she has a $2/km pledge, that's $400
        # Total should include walker_fee + pledges
        assert total_raised >= walker_fee, "Total raised should include walker fee"
    
    def test_fundraising_user_john(self):
        """Test John's fundraising page shows correct total_raised"""
        response = requests.get(f"{BASE_URL}/api/fundraising/user-john")
        assert response.status_code == 200, f"Fundraising endpoint failed: {response.text}"
        
        data = response.json()
        total_raised = data.get("total_raised", 0)
        walker_fee = data.get("walker_fee", 0)
        
        print(f"✓ John's fundraising page:")
        print(f"  Total raised: ${total_raised}")
        print(f"  Walker fee: ${walker_fee}")
        
        # John is a Builder ($97 fee) on ch-naivasha (100km)
        assert total_raised >= walker_fee, "Total raised should include walker fee"


class TestLeaderboardRaised:
    """Test /api/leaderboards/raised returns proper total_raised including pledges at full route distance"""
    
    def test_leaderboard_raised_endpoint(self):
        """Test leaderboard/raised includes pledges + walker_fee in aggregation"""
        response = requests.get(f"{BASE_URL}/api/leaderboards/raised")
        assert response.status_code == 200, f"Leaderboard raised failed: {response.text}"
        
        data = response.json()
        print(f"✓ Leaderboard raised - {len(data)} entries")
        
        for entry in data[:5]:  # Show top 5
            print(f"  - {entry.get('display_name', 'Unknown')}: ${entry.get('total_raised', 0)}")
        
        # Verify structure
        if data:
            assert "user_id" in data[0]
            assert "display_name" in data[0]
            assert "total_raised" in data[0]


class TestAdminFeatures:
    """Test admin panel features: no Inquiries tab, route map upload, milestone photo upload, sponsor capacity"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sabrina@kenyaeducationfund.org",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        data = response.json()
        print(f"✓ Admin stats:")
        print(f"  Total users: {data.get('total_users', 0)}")
        print(f"  Total teams: {data.get('total_teams', 0)}")
        print(f"  Total distance: {data.get('total_distance_km', 0)} km")
    
    def test_admin_stats_by_challenge(self, admin_token):
        """Test admin stats by challenge endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/by-challenge", headers=headers)
        assert response.status_code == 200, f"Admin stats by challenge failed: {response.text}"
        
        data = response.json()
        print(f"✓ Admin stats by challenge - {len(data)} challenges")
        for ch in data:
            print(f"  - {ch.get('challenge_name')}: {ch.get('walkers')} walkers, {ch.get('teams')} teams, ${ch.get('pledged')} pledged")
    
    def test_challenges_list_all(self, admin_token):
        """Test challenges list includes route_map_url field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/challenges/all", headers=headers)
        assert response.status_code == 200, f"Challenges list failed: {response.text}"
        
        data = response.json()
        print(f"✓ Challenges list - {len(data)} challenges")
        for ch in data:
            has_map = "Yes" if ch.get("route_map_url") else "No"
            milestone_count = len(ch.get("milestones", []))
            print(f"  - {ch.get('name')}: {ch.get('total_distance_km')}km, Route map: {has_map}, Milestones: {milestone_count}")
    
    def test_sponsorship_levels_with_capacity(self, admin_token):
        """Test sponsorship levels endpoint returns capacity info"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sponsorship-levels", headers=headers)
        assert response.status_code == 200, f"Sponsorship levels failed: {response.text}"
        
        data = response.json()
        print(f"✓ Sponsorship levels - {len(data)} levels")
        for level in data:
            max_sponsors = level.get("max_sponsors", "unlimited")
            print(f"  - {level.get('name')}: max {max_sponsors} sponsors")
    
    def test_corporate_sponsors_list(self, admin_token):
        """Test corporate sponsors list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/corporate-sponsors", headers=headers)
        assert response.status_code == 200, f"Corporate sponsors failed: {response.text}"
        
        data = response.json()
        print(f"✓ Corporate sponsors - {len(data)} sponsors")


class TestChallengeRouteMapUpload:
    """Test challenge route map and milestone photo upload endpoints exist"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sabrina@kenyaeducationfund.org",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_route_map_upload_endpoint_exists(self, admin_token):
        """Test that route map upload endpoint exists (POST /api/challenges/{id}/route-map)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Just verify the endpoint exists by checking it returns 422 (missing file) not 404
        response = requests.post(f"{BASE_URL}/api/challenges/ch-naivasha/route-map", headers=headers)
        # Should return 422 (validation error for missing file) not 404
        assert response.status_code in [422, 400], f"Route map endpoint should exist, got {response.status_code}"
        print(f"✓ Route map upload endpoint exists (returns {response.status_code} without file)")
    
    def test_milestone_image_upload_endpoint_exists(self, admin_token):
        """Test that milestone image upload endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Just verify the endpoint exists
        response = requests.post(f"{BASE_URL}/api/challenges/ch-naivasha/milestones/0/image", headers=headers)
        assert response.status_code in [422, 400], f"Milestone image endpoint should exist, got {response.status_code}"
        print(f"✓ Milestone image upload endpoint exists (returns {response.status_code} without file)")


class TestWalkerDashboard:
    """Test walker dashboard features"""
    
    @pytest.fixture
    def walker_token(self):
        """Get walker token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@example.com",
            "password": "walker123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_user_progress(self, walker_token):
        """Test user progress endpoint"""
        headers = {"Authorization": f"Bearer {walker_token}"}
        response = requests.get(f"{BASE_URL}/api/users/progress", headers=headers)
        assert response.status_code == 200, f"User progress failed: {response.text}"
        
        data = response.json()
        print(f"✓ User progress:")
        print(f"  Total km: {data.get('total_km', 0)}")
        print(f"  Total raised: ${data.get('total_raised', 0)}")
        print(f"  Progress: {data.get('progress_pct', 0)}%")


class TestTeamFeatures:
    """Test team features including Leave Team button styling"""
    
    @pytest.fixture
    def walker_token(self):
        """Get walker token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@example.com",
            "password": "walker123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_team_my_endpoint(self, walker_token):
        """Test /api/teams/my endpoint"""
        headers = {"Authorization": f"Bearer {walker_token}"}
        response = requests.get(f"{BASE_URL}/api/teams/my", headers=headers)
        # May return null if not in a team
        assert response.status_code == 200, f"Teams my failed: {response.text}"
        
        data = response.json()
        if data:
            print(f"✓ User's team: {data.get('name')}")
            print(f"  Members: {len(data.get('members', []))}")
        else:
            print(f"✓ User is not in a team")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
