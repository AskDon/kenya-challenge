import requests
import sys
from datetime import datetime
import json

class KenyaChallengeAPITester:
    def __init__(self, base_url="https://kenyamiles.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.walker_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
            if details:
                print(f"   {details}")
        else:
            self.failed_tests.append({"name": test_name, "details": details})
            print(f"❌ {test_name} - FAILED")
            if details:
                print(f"   {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    resp_data = response.json()
                    if success and isinstance(resp_data, dict):
                        details += f" | Response keys: {list(resp_data.keys())}"
                    elif not success:
                        details += f" | Error: {resp_data.get('detail', 'Unknown error')}"
                except:
                    pass
            
            self.log_result(name, success, details)
            return success, response.json() if success else {}

        except requests.exceptions.RequestException as e:
            self.log_result(name, False, f"Request error: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_result(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    # Authentication Tests
    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "sabrina@kenyaeducationfund.org", "password": "admin123"}
        )
        if success and 'token' in response and response.get('user', {}).get('role') == 'admin':
            self.admin_token = response['token']
            return True
        return False

    def test_walker_login(self):
        """Test walker login"""
        success, response = self.run_test(
            "Walker Login (John)",
            "POST",
            "auth/login",
            200,
            data={"email": "john@example.com", "password": "walker123"}
        )
        if success and 'token' in response and response.get('user', {}).get('role') == 'walker':
            self.walker_token = response['token']
            return True
        return False

    def test_auth_me(self):
        """Test auth/me endpoint"""
        success, response = self.run_test(
            "Get Current User (Walker)",
            "GET",
            "auth/me",
            200,
            token=self.walker_token
        )
        return success and response.get('role') == 'walker'

    # Challenge Tests
    def test_get_challenges(self):
        """Test getting challenges"""
        success, response = self.run_test(
            "Get Public Challenges",
            "GET",
            "challenges",
            200
        )
        return success and isinstance(response, list) and len(response) > 0

    def test_get_pricing_levels(self):
        """Test getting pricing levels"""
        success, response = self.run_test(
            "Get Pricing Levels",
            "GET",
            "pricing-levels",
            200
        )
        return success and isinstance(response, list) and len(response) >= 5

    # User Progress Tests
    def test_user_progress(self):
        """Test user progress endpoint"""
        success, response = self.run_test(
            "Get User Progress",
            "GET",
            "users/progress",
            200,
            token=self.walker_token
        )
        return success and 'total_km' in response and 'challenge' in response

    # Activity Tests
    def test_get_activities(self):
        """Test getting user activities"""
        success, response = self.run_test(
            "Get User Activities",
            "GET",
            "activities",
            200,
            token=self.walker_token
        )
        return success and isinstance(response, list)

    def test_create_activity(self):
        """Test creating an activity"""
        success, response = self.run_test(
            "Create Activity",
            "POST",
            "activities",
            201,
            data={"date": datetime.now().strftime("%Y-%m-%d"), "steps": 5000},
            token=self.walker_token
        )
        return success and 'id' in response and response.get('steps') == 5000

    # Team Tests
    def test_get_team(self):
        """Test getting user's team"""
        success, response = self.run_test(
            "Get User Team",
            "GET",
            "teams/my",
            200,
            token=self.walker_token
        )
        return success  # May return None if no team

    # Fundraising Tests
    def test_fundraising_page(self):
        """Test fundraising page data"""
        success, response = self.run_test(
            "Get Fundraising Page (John)",
            "GET",
            "fundraising/user-john",
            200
        )
        return success and 'walker' in response and 'total_km' in response

    def test_create_sponsor(self):
        """Test creating a sponsor"""
        success, response = self.run_test(
            "Create Sponsor",
            "POST",
            "sponsors/user-john",
            201,
            data={
                "name": "Test Sponsor",
                "email": "sponsor@test.com", 
                "amount": 25,
                "message": "Great work!"
            }
        )
        return success and 'id' in response

    # Leaderboard Tests
    def test_leaderboard_distance(self):
        """Test distance leaderboard"""
        success, response = self.run_test(
            "Leaderboard - Distance",
            "GET",
            "leaderboards/distance",
            200
        )
        return success and isinstance(response, list)

    def test_leaderboard_raised(self):
        """Test fundraising leaderboard"""
        success, response = self.run_test(
            "Leaderboard - Raised",
            "GET",
            "leaderboards/raised",
            200
        )
        return success and isinstance(response, list)

    def test_leaderboard_teams_distance(self):
        """Test team distance leaderboard"""
        success, response = self.run_test(
            "Leaderboard - Teams Distance",
            "GET",
            "leaderboards/teams/distance",
            200
        )
        return success and isinstance(response, list)

    def test_leaderboard_teams_raised(self):
        """Test team fundraising leaderboard"""
        success, response = self.run_test(
            "Leaderboard - Teams Raised",
            "GET",
            "leaderboards/teams/raised",
            200
        )
        return success and isinstance(response, list)

    # Admin Tests
    def test_admin_stats(self):
        """Test admin stats"""
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            token=self.admin_token
        )
        return success and 'total_users' in response

    def test_admin_users(self):
        """Test admin user list"""
        success, response = self.run_test(
            "Admin User List",
            "GET",
            "admin/users",
            200,
            token=self.admin_token
        )
        return success and isinstance(response, list) and len(response) >= 3

    def test_admin_config(self):
        """Test admin config"""
        success, response = self.run_test(
            "Admin Config",
            "GET",
            "admin/config",
            200,
            token=self.admin_token
        )
        return success and 'name' in response

    # Payment Mock Test
    def test_mark_paid(self):
        """Test mock payment"""
        success, response = self.run_test(
            "Mark User as Paid (Mock)",
            "POST",
            "users/mark-paid",
            200,
            token=self.walker_token
        )
        return success and 'message' in response

def main():
    print("🚀 Starting Kenya Challenge API Testing\n")
    print("=" * 60)
    
    tester = KenyaChallengeAPITester()
    
    # Authentication flow
    print("\n📝 AUTHENTICATION TESTS")
    print("-" * 30)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed - stopping tests")
        return 1
    
    if not tester.test_walker_login():
        print("❌ Walker login failed - stopping tests") 
        return 1
    
    tester.test_auth_me()
    
    # Public endpoints
    print("\n🌍 PUBLIC ENDPOINTS")
    print("-" * 30)
    tester.test_get_challenges()
    tester.test_get_pricing_levels()
    
    # User functionality
    print("\n👤 USER FUNCTIONALITY")
    print("-" * 30)
    tester.test_user_progress()
    tester.test_get_activities()
    tester.test_create_activity()
    tester.test_get_team()
    
    # Fundraising
    print("\n💰 FUNDRAISING")
    print("-" * 30)
    tester.test_fundraising_page()
    tester.test_create_sponsor()
    
    # Leaderboards
    print("\n🏆 LEADERBOARDS")
    print("-" * 30)
    tester.test_leaderboard_distance()
    tester.test_leaderboard_raised()
    tester.test_leaderboard_teams_distance()
    tester.test_leaderboard_teams_raised()
    
    # Admin functionality
    print("\n👨‍💼 ADMIN FUNCTIONALITY")
    print("-" * 30)
    tester.test_admin_stats()
    tester.test_admin_users()
    tester.test_admin_config()
    
    # Mock payment
    print("\n💳 MOCK PAYMENT")
    print("-" * 30)
    tester.test_mark_paid()
    
    # Final results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(tester.failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS ({len(tester.failed_tests)}):")
        for test in tester.failed_tests:
            print(f"  • {test['name']}: {test['details']}")
    else:
        print("\n🎉 ALL TESTS PASSED!")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())