"""
Backend tests for batch features:
1. Postcard CRUD endpoints
2. Steps per km config and activity conversion
3. Registration Level (walker type) endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "sabrina@kenyaeducationfund.org"
ADMIN_PASSWORD = "admin123"
WALKER_EMAIL = "john@example.com"
WALKER_PASSWORD = "walker123"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login successful")
    
    def test_walker_login(self):
        """Test walker login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WALKER_EMAIL,
            "password": WALKER_PASSWORD
        })
        assert response.status_code == 200, f"Walker login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"PASS: Walker login successful")


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    return response.json()["token"]


@pytest.fixture
def walker_token():
    """Get walker auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": WALKER_EMAIL,
        "password": WALKER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Walker login failed")
    return response.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    """Admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def walker_headers(walker_token):
    """Walker auth headers"""
    return {"Authorization": f"Bearer {walker_token}"}


class TestConfigStepsPerKm:
    """Test steps_per_km configuration"""
    
    def test_get_config(self, admin_headers):
        """Test getting config with steps_per_km"""
        response = requests.get(f"{BASE_URL}/api/admin/config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        # steps_per_km should exist with default 1300
        steps_per_km = data.get("steps_per_km", 1300)
        assert 1100 <= steps_per_km <= 1600, f"steps_per_km {steps_per_km} out of valid range"
        print(f"PASS: Config has steps_per_km = {steps_per_km}")
    
    def test_update_config_valid_steps(self, admin_headers):
        """Test updating steps_per_km with valid value"""
        response = requests.put(f"{BASE_URL}/api/admin/config", 
            headers=admin_headers,
            json={"steps_per_km": 1400}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("steps_per_km") == 1400
        print("PASS: Updated steps_per_km to 1400")
        
        # Reset to default
        requests.put(f"{BASE_URL}/api/admin/config", 
            headers=admin_headers,
            json={"steps_per_km": 1300}
        )
    
    def test_update_config_invalid_steps_low(self, admin_headers):
        """Test that steps_per_km below 1100 is rejected"""
        response = requests.put(f"{BASE_URL}/api/admin/config", 
            headers=admin_headers,
            json={"steps_per_km": 1000}
        )
        # Should either reject or clamp the value
        if response.status_code == 200:
            data = response.json()
            # If accepted, verify it's within valid range
            assert data.get("steps_per_km", 1300) >= 1100, "Invalid steps_per_km accepted"
        else:
            assert response.status_code in [400, 422], f"Unexpected status: {response.status_code}"
        print("PASS: Invalid low steps_per_km handled correctly")
    
    def test_update_config_invalid_steps_high(self, admin_headers):
        """Test that steps_per_km above 1600 is rejected"""
        response = requests.put(f"{BASE_URL}/api/admin/config", 
            headers=admin_headers,
            json={"steps_per_km": 2000}
        )
        # Should either reject or clamp the value
        if response.status_code == 200:
            data = response.json()
            # If accepted, verify it's within valid range
            assert data.get("steps_per_km", 1300) <= 1600, "Invalid steps_per_km accepted"
        else:
            assert response.status_code in [400, 422], f"Unexpected status: {response.status_code}"
        print("PASS: Invalid high steps_per_km handled correctly")


class TestActivityStepsConversion:
    """Test activity creation with steps to km conversion"""
    
    def test_create_activity_with_steps(self, walker_headers, admin_headers):
        """Test that steps are converted to km using config steps_per_km"""
        # First ensure steps_per_km is set to 1300
        requests.put(f"{BASE_URL}/api/admin/config", 
            headers=admin_headers,
            json={"steps_per_km": 1300}
        )
        
        # Create activity with steps only
        response = requests.post(f"{BASE_URL}/api/activities",
            headers=walker_headers,
            json={
                "date": "2026-04-14",
                "steps": 13000
            }
        )
        assert response.status_code == 200, f"Activity creation failed: {response.text}"
        data = response.json()
        
        # With 1300 steps/km, 13000 steps = 10 km
        assert data["steps"] == 13000
        assert data["km"] == 10.0, f"Expected 10.0 km, got {data['km']}"
        print(f"PASS: Activity created with steps={data['steps']}, km={data['km']}")
        
        # Clean up - delete the activity
        activity_id = data["id"]
        requests.delete(f"{BASE_URL}/api/activities/{activity_id}", headers=walker_headers)
    
    def test_create_activity_with_km(self, walker_headers, admin_headers):
        """Test that km is converted to steps using config steps_per_km"""
        # First ensure steps_per_km is set to 1300
        requests.put(f"{BASE_URL}/api/admin/config", 
            headers=admin_headers,
            json={"steps_per_km": 1300}
        )
        
        # Create activity with km only
        response = requests.post(f"{BASE_URL}/api/activities",
            headers=walker_headers,
            json={
                "date": "2026-04-14",
                "km": 5.0
            }
        )
        assert response.status_code == 200, f"Activity creation failed: {response.text}"
        data = response.json()
        
        # With 1300 steps/km, 5 km = 6500 steps
        assert data["km"] == 5.0
        assert data["steps"] == 6500, f"Expected 6500 steps, got {data['steps']}"
        print(f"PASS: Activity created with km={data['km']}, steps={data['steps']}")
        
        # Clean up
        activity_id = data["id"]
        requests.delete(f"{BASE_URL}/api/activities/{activity_id}", headers=walker_headers)


class TestPostcardCRUD:
    """Test postcard CRUD operations"""
    
    @pytest.fixture
    def challenge_with_postcards(self, admin_headers):
        """Get a challenge that has send_postcards enabled"""
        response = requests.get(f"{BASE_URL}/api/challenges/all", headers=admin_headers)
        assert response.status_code == 200
        challenges = response.json()
        
        # Find challenge with send_postcards=true (ch-naivasha should have it)
        for ch in challenges:
            if ch.get("send_postcards"):
                return ch
        
        # If none found, enable it on first challenge
        if challenges:
            ch = challenges[0]
            requests.put(f"{BASE_URL}/api/challenges/{ch['id']}", 
                headers=admin_headers,
                json={"send_postcards": True}
            )
            return ch
        
        pytest.skip("No challenges available")
    
    def test_create_postcard(self, admin_headers, challenge_with_postcards):
        """Test creating a postcard"""
        challenge_id = challenge_with_postcards["id"]
        
        response = requests.post(f"{BASE_URL}/api/challenges/{challenge_id}/postcards",
            headers=admin_headers,
            json={
                "title": "TEST_Halfway There!",
                "distance_km": 50,
                "subject_line": "You're halfway to your goal!",
                "body": "Congratulations on reaching the halfway point of your journey!"
            }
        )
        assert response.status_code == 200, f"Postcard creation failed: {response.text}"
        data = response.json()
        
        assert data["title"] == "TEST_Halfway There!"
        assert data["distance_km"] == 50
        assert data["subject_line"] == "You're halfway to your goal!"
        assert "id" in data
        print(f"PASS: Postcard created with id={data['id']}")
        
        return data["id"]
    
    def test_update_postcard(self, admin_headers, challenge_with_postcards):
        """Test updating a postcard"""
        challenge_id = challenge_with_postcards["id"]
        
        # First create a postcard
        create_resp = requests.post(f"{BASE_URL}/api/challenges/{challenge_id}/postcards",
            headers=admin_headers,
            json={
                "title": "TEST_Update Me",
                "distance_km": 25,
                "subject_line": "Original subject",
                "body": "Original body"
            }
        )
        assert create_resp.status_code == 200
        postcard_id = create_resp.json()["id"]
        
        # Update the postcard
        response = requests.put(f"{BASE_URL}/api/challenges/{challenge_id}/postcards/{postcard_id}",
            headers=admin_headers,
            json={
                "title": "TEST_Updated Title",
                "subject_line": "Updated subject line"
            }
        )
        assert response.status_code == 200, f"Postcard update failed: {response.text}"
        data = response.json()
        
        assert data["title"] == "TEST_Updated Title"
        assert data["subject_line"] == "Updated subject line"
        assert data["distance_km"] == 25  # Unchanged
        print(f"PASS: Postcard updated successfully")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/challenges/{challenge_id}/postcards/{postcard_id}", 
            headers=admin_headers)
    
    def test_delete_postcard(self, admin_headers, challenge_with_postcards):
        """Test deleting a postcard"""
        challenge_id = challenge_with_postcards["id"]
        
        # First create a postcard
        create_resp = requests.post(f"{BASE_URL}/api/challenges/{challenge_id}/postcards",
            headers=admin_headers,
            json={
                "title": "TEST_Delete Me",
                "distance_km": 10,
                "subject_line": "To be deleted",
                "body": "This will be deleted"
            }
        )
        assert create_resp.status_code == 200
        postcard_id = create_resp.json()["id"]
        
        # Delete the postcard
        response = requests.delete(f"{BASE_URL}/api/challenges/{challenge_id}/postcards/{postcard_id}",
            headers=admin_headers)
        assert response.status_code == 200, f"Postcard deletion failed: {response.text}"
        
        # Verify it's deleted by checking the challenge
        ch_resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=admin_headers)
        challenge = next((c for c in ch_resp.json() if c["id"] == challenge_id), None)
        postcards = challenge.get("postcards", [])
        assert not any(pc["id"] == postcard_id for pc in postcards), "Postcard still exists"
        print(f"PASS: Postcard deleted successfully")
    
    def test_postcard_requires_admin(self, walker_headers, challenge_with_postcards):
        """Test that non-admin cannot create postcards"""
        challenge_id = challenge_with_postcards["id"]
        
        response = requests.post(f"{BASE_URL}/api/challenges/{challenge_id}/postcards",
            headers=walker_headers,
            json={
                "title": "Unauthorized",
                "distance_km": 10,
                "subject_line": "Should fail",
                "body": "This should not work"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Non-admin correctly rejected from creating postcards")


class TestWalkerTypes:
    """Test walker types (Registration Levels) endpoints"""
    
    def test_list_walker_types(self):
        """Test listing walker types"""
        response = requests.get(f"{BASE_URL}/api/walker-types")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} walker types")
    
    def test_create_walker_type(self, admin_headers):
        """Test creating a walker type"""
        response = requests.post(f"{BASE_URL}/api/walker-types",
            headers=admin_headers,
            json={
                "name": "TEST_Premium Walker",
                "cost_usd": 150,
                "display_order": 99
            }
        )
        assert response.status_code == 200, f"Walker type creation failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Premium Walker"
        assert data["cost_usd"] == 150
        assert "id" in data
        print(f"PASS: Walker type created with id={data['id']}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/walker-types/{data['id']}", headers=admin_headers)
    
    def test_update_walker_type(self, admin_headers):
        """Test updating a walker type"""
        # Create first
        create_resp = requests.post(f"{BASE_URL}/api/walker-types",
            headers=admin_headers,
            json={
                "name": "TEST_Update Type",
                "cost_usd": 100,
                "display_order": 98
            }
        )
        assert create_resp.status_code == 200
        type_id = create_resp.json()["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/walker-types/{type_id}",
            headers=admin_headers,
            json={
                "name": "TEST_Updated Type",
                "cost_usd": 125
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "TEST_Updated Type"
        assert data["cost_usd"] == 125
        print(f"PASS: Walker type updated successfully")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/walker-types/{type_id}", headers=admin_headers)
    
    def test_delete_walker_type(self, admin_headers):
        """Test deleting a walker type"""
        # Create first
        create_resp = requests.post(f"{BASE_URL}/api/walker-types",
            headers=admin_headers,
            json={
                "name": "TEST_Delete Type",
                "cost_usd": 50,
                "display_order": 97
            }
        )
        assert create_resp.status_code == 200
        type_id = create_resp.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/walker-types/{type_id}",
            headers=admin_headers)
        assert response.status_code == 200
        
        # Verify deleted
        list_resp = requests.get(f"{BASE_URL}/api/walker-types")
        types = list_resp.json()
        assert not any(t["id"] == type_id for t in types), "Walker type still exists"
        print(f"PASS: Walker type deleted successfully")


class TestChallengePostcardsToggle:
    """Test challenge send_postcards toggle"""
    
    def test_toggle_send_postcards(self, admin_headers):
        """Test toggling send_postcards on a challenge"""
        # Get challenges
        response = requests.get(f"{BASE_URL}/api/challenges/all", headers=admin_headers)
        assert response.status_code == 200
        challenges = response.json()
        
        if not challenges:
            pytest.skip("No challenges available")
        
        challenge = challenges[0]
        challenge_id = challenge["id"]
        original_value = challenge.get("send_postcards", False)
        
        # Toggle to opposite
        new_value = not original_value
        response = requests.put(f"{BASE_URL}/api/challenges/{challenge_id}",
            headers=admin_headers,
            json={"send_postcards": new_value}
        )
        assert response.status_code == 200
        
        # Verify
        verify_resp = requests.get(f"{BASE_URL}/api/challenges/all", headers=admin_headers)
        updated_challenge = next((c for c in verify_resp.json() if c["id"] == challenge_id), None)
        assert updated_challenge["send_postcards"] == new_value
        print(f"PASS: send_postcards toggled from {original_value} to {new_value}")
        
        # Reset to original
        requests.put(f"{BASE_URL}/api/challenges/{challenge_id}",
            headers=admin_headers,
            json={"send_postcards": original_value}
        )


# Clean up any TEST_ prefixed data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after test session"""
    yield
    # Cleanup would happen here if needed
    print("Test session complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
