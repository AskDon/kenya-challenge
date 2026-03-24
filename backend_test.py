#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class KenyaChallengeAPITester:
    def __init__(self, base_url="https://challenge-admin-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_id = None

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            print(f"❌ {test_name}: FAILED {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            response_data = {}
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            message = f"Status: {response.status_code}"
            if not success:
                message += f" (expected {expected_status})"
                if response_data.get('detail'):
                    message += f" - {response_data['detail']}"

            self.log_result(name, success, message, response_data)
            return success, response_data

        except Exception as e:
            self.log_result(name, False, f"Error: {str(e)}")
            return False, {}

    def test_signup_new_user(self):
        """Test signup with full_name field"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_{timestamp}@example.com"
        
        signup_data = {
            "full_name": f"Test User {timestamp}",
            "display_name": f"TestWalker{timestamp}",
            "email": test_email,
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Signup with full_name", 
            "POST", 
            "auth/signup", 
            200, 
            signup_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
                # Verify full_name is in response
                if response['user'].get('full_name') == signup_data['full_name']:
                    self.log_result("Signup returns full_name", True, f"full_name: {response['user']['full_name']}")
                else:
                    self.log_result("Signup returns full_name", False, "full_name missing or incorrect")
            return True
        return False

    def test_login_existing_user(self):
        """Test login with john@example.com"""
        login_data = {
            "email": "john@example.com",
            "password": "walker123"
        }
        
        success, response = self.run_test(
            "Login existing user (john@example.com)", 
            "POST", 
            "auth/login", 
            200, 
            login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
                # Verify full_name exists (not first_name)
                if response['user'].get('full_name') == 'John Walker':
                    self.log_result("Login returns full_name", True, f"full_name: {response['user']['full_name']}")
                else:
                    self.log_result("Login returns full_name", False, f"Expected 'John Walker', got {response['user'].get('full_name')}")
            return True
        return False

    def test_get_profile(self):
        """Test getting user profile"""
        success, response = self.run_test("Get user profile", "GET", "auth/me", 200)
        
        if success:
            # Check that first_name is NOT in response (should be full_name)
            if 'first_name' in response:
                self.log_result("Profile has no first_name field", False, "first_name field found (should be full_name)")
            else:
                self.log_result("Profile has no first_name field", True, "first_name field correctly absent")
            
            # Check full_name exists
            if response.get('full_name'):
                self.log_result("Profile has full_name field", True, f"full_name: {response['full_name']}")
            else:
                self.log_result("Profile has full_name field", False, "full_name field missing")
        
        return success

    def test_challenges_endpoint(self):
        """Test challenges endpoint"""
        success, response = self.run_test("Get challenges", "GET", "challenges", 200)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                self.log_result("Challenges available", True, f"Found {len(response)} challenges")
                # Check challenge structure
                challenge = response[0]
                if all(key in challenge for key in ['id', 'name', 'description', 'total_distance_km']):
                    self.log_result("Challenge structure valid", True, f"Challenge: {challenge['name']}")
                else:
                    self.log_result("Challenge structure valid", False, "Missing required fields")
            else:
                self.log_result("Challenges available", False, "No challenges found")
        
        return success

    def test_walker_types_endpoint(self):
        """Test walker types endpoint"""
        success, response = self.run_test("Get walker types", "GET", "walker-types", 200)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                self.log_result("Walker types available", True, f"Found {len(response)} walker types")
                # Check for Basic, Builder, Leader
                names = [wt.get('name') for wt in response]
                expected = ['Basic', 'Builder', 'Leader']
                if all(name in names for name in expected):
                    self.log_result("Walker types correct", True, f"Found: {names}")
                else:
                    self.log_result("Walker types correct", False, f"Expected {expected}, got {names}")
            else:
                self.log_result("Walker types available", False, "No walker types found")
        
        return success

    def test_achievement_levels_endpoint(self):
        """Test achievement levels endpoint"""
        success, response = self.run_test("Get achievement levels", "GET", "achievement-levels", 200)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                self.log_result("Achievement levels available", True, f"Found {len(response)} levels")
                # Check structure
                level = response[0]
                if all(key in level for key in ['id', 'achievement', 'swag', 'total_amount_usd']):
                    self.log_result("Achievement level structure valid", True, f"Level: {level['achievement']}")
                else:
                    self.log_result("Achievement level structure valid", False, "Missing required fields")
            else:
                self.log_result("Achievement levels available", False, "No achievement levels found")
        
        return success

    def test_teams_search(self):
        """Test teams search endpoint"""
        success, response = self.run_test("Search teams (empty query)", "GET", "teams/search", 200)
        
        if success:
            self.log_result("Teams search works", True, f"Found {len(response)} teams")
        
        # Test with query parameter
        success2, response2 = self.run_test("Search teams (trail query)", "GET", "teams/search?q=trail", 200)
        
        if success2:
            self.log_result("Teams search with query works", True, f"Found {len(response2)} teams with 'trail'")
        
        return success and success2

    def test_user_progress(self):
        """Test user progress endpoint (requires auth)"""
        if not self.token:
            self.log_result("User progress", False, "No token available")
            return False
            
        success, response = self.run_test("Get user progress", "GET", "users/progress", 200)
        
        if success:
            # Check required fields
            required_fields = ['total_km', 'total_steps', 'total_raised']
            if all(field in response for field in required_fields):
                self.log_result("Progress structure valid", True, f"km: {response['total_km']}, raised: ${response['total_raised']}")
            else:
                self.log_result("Progress structure valid", False, f"Missing fields from {required_fields}")
        
        return success

    def test_supporter_invites(self):
        """Test supporter invites endpoint (requires auth)"""
        if not self.token:
            self.log_result("Supporter invites", False, "No token available")
            return False
            
        # Test creating supporter invite
        invite_data = {
            "name": "Test Supporter",
            "email": "supporter@example.com"
        }
        
        success, response = self.run_test("Create supporter invite", "POST", "supporter-invites", 200, invite_data)
        
        if success:
            self.log_result("Supporter invite created", True, f"ID: {response.get('id')}")
        
        # Test getting supporter invites
        success2, response2 = self.run_test("Get supporter invites", "GET", "supporter-invites", 200)
        
        return success and success2

    def test_sponsors_endpoint(self):
        """Test sponsors endpoint for john user"""
        # Test specific endpoint mentioned in requirements: GET /api/sponsors/user-john
        success, response = self.run_test("Get sponsors for user-john", "GET", "sponsors/user-john", 200)
        
        if success:
            if isinstance(response, list):
                self.log_result("Sponsors data structure", True, f"Found {len(response)} sponsors")
            else:
                self.log_result("Sponsors data structure", False, "Response is not a list")
        
        # Also test general sponsors endpoint
        if self.user_id:
            success2, response2 = self.run_test("Get sponsors for current user", "GET", f"sponsors/{self.user_id}", 200)
            if success2:
                self.log_result("Current user sponsors", True, f"Found {len(response2)} sponsors")
        
        return success

    def run_all_tests(self):
        """Run all tests"""
        print("🔍 Starting Kenya Challenge API Tests...\n")
        
        # Test basic endpoints (no auth required)
        self.test_challenges_endpoint()
        self.test_walker_types_endpoint() 
        self.test_achievement_levels_endpoint()
        self.test_teams_search()
        
        print("\n🔐 Testing authentication...")
        
        # Test login with existing user first
        if self.test_login_existing_user():
            self.test_get_profile()
            self.test_user_progress()
            self.test_supporter_invites()
            self.test_sponsors_endpoint()  # Add new test
        
        print("\n👤 Testing new user signup...")
        # Reset token and test new user signup
        self.token = None
        self.user_id = None
        self.test_signup_new_user()
        
        # Print final results
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

def main():
    tester = KenyaChallengeAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())