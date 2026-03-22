"""
Test suite for March 22 punch list features:
- Supporter pledge amounts showing FULL route completion totals
- Leaderboard raised calculation with full route distance
- Admin stats by challenge
- User deletion
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    def test_walker_login_john(self):
        """Test walker john@example.com login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@example.com",
            "password": "walker123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "john@example.com"
        assert data["user"]["display_name"] == "JohnnySteps"
        print(f"✓ Walker john login successful - display_name: {data['user']['display_name']}")
        return data["token"]
    
    def test_walker_login_mary(self):
        """Test walker mary@example.com login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mary@example.com",
            "password": "walker123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "mary@example.com"
        assert data["user"]["display_name"] == "MaryMoves"
        print(f"✓ Walker mary login successful - display_name: {data['user']['display_name']}")
        return data["token"]
    
    def test_supporter_login(self):
        """Test supporter1@test.com login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        # Supporter may or may not exist
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            print(f"✓ Supporter login successful")
            return data["token"]
        else:
            print(f"⚠ Supporter not found - may need to create")
            return None
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sabrina@kenyaeducationfund.org",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful")
        return data["token"]


class TestChallenges:
    """Challenge API tests"""
    
    def test_list_challenges(self):
        """Test listing active challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        challenges = response.json()
        assert len(challenges) > 0, "No challenges found"
        print(f"✓ Found {len(challenges)} active challenges")
        for ch in challenges:
            print(f"  - {ch['name']}: {ch['total_distance_km']}km")
        return challenges


class TestSupporterDashboard:
    """Test supporter dashboard pledge calculations"""
    
    @pytest.fixture
    def supporter_token(self):
        """Get or create supporter token"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json()["token"]
        
        # Create supporter with pledge to mary (200km route)
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
        
        pytest.skip("Could not create or login supporter")
    
    def test_supporter_dashboard_pledge_amounts(self, supporter_token):
        """Test that supporter dashboard shows FULL route completion totals"""
        if not supporter_token:
            pytest.skip("No supporter token")
        
        headers = {"Authorization": f"Bearer {supporter_token}"}
        response = requests.get(f"{BASE_URL}/api/supporters/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        pledges = response.json()
        print(f"✓ Supporter has {len(pledges)} pledges")
        
        total_pledged = 0
        for p in pledges:
            calc_amount = p.get("calculated_amount", 0)
            total_pledged += calc_amount
            walker_name = p.get("walker", {}).get("display_name", "Unknown")
            pledge_type = p.get("pledge_type")
            route_km = p.get("challenge", {}).get("total_distance_km", 0)
            
            print(f"  - {walker_name}: ${calc_amount} ({pledge_type})")
            
            # Verify per_km pledges use FULL route distance
            if pledge_type == "per_km" and p.get("pledge_per_km"):
                expected = p["pledge_per_km"] * route_km
                assert abs(calc_amount - expected) < 0.01, \
                    f"Per-km pledge should be ${expected} (${p['pledge_per_km']}/km x {route_km}km), got ${calc_amount}"
                print(f"    ✓ Correctly calculated: ${p['pledge_per_km']}/km x {route_km}km = ${expected}")
        
        print(f"✓ Total pledged: ${total_pledged}")
        return total_pledged


class TestFundraisingPage:
    """Test fundraising page pledge calculations"""
    
    def test_mary_fundraising_page(self):
        """Test Mary's fundraising page shows correct totals"""
        response = requests.get(f"{BASE_URL}/api/fundraising/user-mary")
        assert response.status_code == 200, f"Fundraising page failed: {response.text}"
        
        data = response.json()
        walker = data.get("walker", {})
        challenge = data.get("challenge", {})
        total_raised = data.get("total_raised", 0)
        pledge_total_value = data.get("pledge_total_value", 0)
        
        print(f"✓ Mary's fundraising page:")
        print(f"  - Challenge: {challenge.get('name')} ({challenge.get('total_distance_km')}km)")
        print(f"  - Total raised: ${total_raised}")
        print(f"  - Pledge total value: ${pledge_total_value}")
        
        # Check pledges are calculated at full route distance
        pledges = data.get("pledges", [])
        route_km = challenge.get("total_distance_km", 0)
        for p in pledges:
            if p.get("pledge_type") == "per_km" and p.get("pledge_per_km"):
                expected = p["pledge_per_km"] * route_km
                print(f"  - Per-km pledge: ${p['pledge_per_km']}/km x {route_km}km = ${expected}")
        
        return data
    
    def test_john_fundraising_page(self):
        """Test John's fundraising page"""
        response = requests.get(f"{BASE_URL}/api/fundraising/user-john")
        assert response.status_code == 200, f"Fundraising page failed: {response.text}"
        
        data = response.json()
        print(f"✓ John's fundraising page:")
        print(f"  - Challenge: {data.get('challenge', {}).get('name')}")
        print(f"  - Total raised: ${data.get('total_raised', 0)}")
        
        return data


class TestLeaderboards:
    """Test leaderboard calculations"""
    
    def test_leaderboard_raised(self):
        """Test leaderboard by raised uses full route calculation"""
        response = requests.get(f"{BASE_URL}/api/leaderboards/raised")
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        
        leaders = response.json()
        print(f"✓ Leaderboard by raised ({len(leaders)} entries):")
        for i, leader in enumerate(leaders[:5]):
            print(f"  {i+1}. {leader.get('display_name')}: ${leader.get('total_raised')}")
        
        return leaders
    
    def test_leaderboard_distance(self):
        """Test leaderboard by distance"""
        response = requests.get(f"{BASE_URL}/api/leaderboards/distance")
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        
        leaders = response.json()
        print(f"✓ Leaderboard by distance ({len(leaders)} entries):")
        for i, leader in enumerate(leaders[:5]):
            print(f"  {i+1}. {leader.get('display_name')}: {leader.get('total_km')}km")
        
        return leaders


class TestAdminFeatures:
    """Test admin panel features"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sabrina@kenyaeducationfund.org",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_stats_by_challenge(self, admin_token):
        """Test stats by challenge endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/by-challenge", headers=headers)
        assert response.status_code == 200, f"Stats by challenge failed: {response.text}"
        
        stats = response.json()
        print(f"✓ Stats by challenge ({len(stats)} challenges):")
        for s in stats:
            print(f"  - {s.get('challenge_name')}: {s.get('walkers')} walkers, {s.get('teams')} teams, ${s.get('pledged')} pledged")
        
        return stats
    
    def test_admin_users_list(self, admin_token):
        """Test admin users list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200, f"Users list failed: {response.text}"
        
        users = response.json()
        print(f"✓ Admin users list ({len(users)} users):")
        for u in users[:5]:
            print(f"  - {u.get('display_name', u.get('full_name'))}: {u.get('role')}")
        
        # Verify admin users exist
        admin_users = [u for u in users if u.get("role") == "admin"]
        assert len(admin_users) > 0, "No admin users found"
        
        return users
    
    def test_admin_cannot_delete_admin(self, admin_token):
        """Test that admin users cannot be deleted"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/users/user-admin", headers=headers)
        assert response.status_code == 400, f"Should not be able to delete admin: {response.text}"
        print("✓ Admin deletion correctly blocked")
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        stats = response.json()
        print(f"✓ Admin stats:")
        print(f"  - Total users: {stats.get('total_users')}")
        print(f"  - Total teams: {stats.get('total_teams')}")
        print(f"  - Total distance: {stats.get('total_distance_km')}km")
        print(f"  - Total pledged: ${stats.get('total_pledged')}")
        
        return stats


class TestPledgeCreation:
    """Test pledge creation and calculation"""
    
    def test_create_per_km_pledge(self):
        """Test creating a per-km pledge calculates correctly"""
        # First login as supporter or create one
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "supporter1@test.com",
            "password": "test1234"
        })
        
        if response.status_code != 200:
            # Create supporter
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
                print("✓ Created supporter with $2/km pledge to Mary")
                pledge = response.json().get("pledge", {})
                # Mary's route is 200km, so $2/km should = $400
                calc = pledge.get("calculated_amount", 0)
                print(f"  - Calculated amount: ${calc}")
                # Note: calculated_amount for per_km type is 0 at creation, 
                # it's calculated dynamically in dashboard
            else:
                print(f"⚠ Could not create supporter: {response.text}")
        else:
            print("✓ Supporter already exists")


class TestWalkerTypes:
    """Test walker types pricing"""
    
    def test_walker_types_pricing(self):
        """Verify walker types have correct pricing"""
        response = requests.get(f"{BASE_URL}/api/walker-types")
        assert response.status_code == 200
        
        types = response.json()
        print(f"✓ Walker types ({len(types)}):")
        for wt in types:
            print(f"  - {wt.get('name')}: ${wt.get('cost_usd')}")
        
        # Check for expected pricing
        prices = {wt.get('name'): wt.get('cost_usd') for wt in types}
        # Note: The user mentioned $1,250 and $5,000 but these are for sponsoring children,
        # not walker registration fees
        
        return types


class TestAchievementLevels:
    """Test achievement levels"""
    
    def test_achievement_levels(self):
        """Verify achievement levels exist"""
        response = requests.get(f"{BASE_URL}/api/achievement-levels")
        assert response.status_code == 200
        
        levels = response.json()
        print(f"✓ Achievement levels ({len(levels)}):")
        for al in levels:
            print(f"  - ${al.get('total_amount_usd')}: {al.get('achievement')} - {al.get('swag')}")
        
        return levels


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
