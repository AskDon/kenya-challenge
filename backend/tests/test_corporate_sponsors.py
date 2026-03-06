"""
Tests for Corporate Sponsors and Sponsorship Levels CRUD functionality
This covers:
- Sponsorship Levels CRUD (admin only)
- Corporate Sponsors CRUD (admin only)
- Max sponsors limit enforcement
- Logo upload/delete
- Public sponsors endpoint grouped by level
"""

import pytest
import requests
import os
import time
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = f"TEST_CORP_{int(time.time())}"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "sabrina@kenyaeducationfund.org",
        "password": "admin123"
    })
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    return response.json()["token"]


@pytest.fixture(scope="module")
def walker_token():
    """Get walker (non-admin) authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "john@example.com",
        "password": "walker123"
    })
    if response.status_code != 200:
        pytest.skip("Walker login failed")
    return response.json()["token"]


@pytest.fixture(scope="module")
def check_base_url():
    """Ensure BASE_URL is configured"""
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL not set")


# ========================================
# Sponsorship Levels Tests
# ========================================

class TestSponsorshipLevelsPublic:
    """Tests for public sponsorship levels endpoint"""

    def test_get_sponsorship_levels_returns_list_ordered_by_display_order(self, check_base_url):
        """GET /api/sponsorship-levels returns all levels ordered by display_order"""
        response = requests.get(f"{BASE_URL}/api/sponsorship-levels")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # Title, Gold, Silver seeded
        
        # Verify ordering
        prev_order = -1
        for level in data:
            assert "id" in level
            assert "name" in level
            assert "max_sponsors" in level
            assert "display_order" in level
            assert level["display_order"] >= prev_order
            prev_order = level["display_order"]
        
        # Verify seeded levels
        level_names = [l["name"] for l in data]
        assert "Title Sponsor" in level_names
        assert "Gold Sponsor" in level_names
        assert "Silver Sponsor" in level_names


class TestSponsorshipLevelsCRUD:
    """Tests for sponsorship levels CRUD (admin only)"""

    def test_create_sponsorship_level_admin_only(self, admin_token, check_base_url):
        """POST /api/sponsorship-levels creates new level (admin only)"""
        payload = {
            "name": f"{TEST_PREFIX} Bronze Level",
            "max_sponsors": 10,
            "display_order": 4
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sponsorship-levels",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["max_sponsors"] == 10
        assert data["display_order"] == 4
        assert "id" in data
        assert "created_at" in data

    def test_create_sponsorship_level_fails_for_non_admin(self, walker_token, check_base_url):
        """POST /api/sponsorship-levels fails for non-admin (403)"""
        response = requests.post(
            f"{BASE_URL}/api/sponsorship-levels",
            json={"name": "Should Fail", "max_sponsors": 5},
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403

    def test_create_sponsorship_level_fails_without_auth(self, check_base_url):
        """POST /api/sponsorship-levels fails without auth (401)"""
        response = requests.post(
            f"{BASE_URL}/api/sponsorship-levels",
            json={"name": "Should Fail", "max_sponsors": 5}
        )
        assert response.status_code == 401

    def test_update_sponsorship_level(self, admin_token, check_base_url):
        """PUT /api/sponsorship-levels/{id} updates level (admin only)"""
        # First create a level to update
        create_res = requests.post(
            f"{BASE_URL}/api/sponsorship-levels",
            json={"name": f"{TEST_PREFIX} Update Test", "max_sponsors": 3, "display_order": 99},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        level_id = create_res.json()["id"]
        
        # Update the level
        update_res = requests.put(
            f"{BASE_URL}/api/sponsorship-levels/{level_id}",
            json={"name": f"{TEST_PREFIX} Updated Level", "max_sponsors": 7},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_res.status_code == 200
        
        # Verify update
        all_levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        updated = next((l for l in all_levels if l["id"] == level_id), None)
        assert updated is not None
        assert updated["name"] == f"{TEST_PREFIX} Updated Level"
        assert updated["max_sponsors"] == 7

    def test_update_sponsorship_level_fails_for_non_admin(self, walker_token, check_base_url):
        """PUT /api/sponsorship-levels/{id} fails for non-admin"""
        levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        if not levels:
            pytest.skip("No levels to test")
        
        response = requests.put(
            f"{BASE_URL}/api/sponsorship-levels/{levels[0]['id']}",
            json={"name": "Should Fail"},
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403

    def test_delete_sponsorship_level_empty(self, admin_token, check_base_url):
        """DELETE /api/sponsorship-levels/{id} deletes level with no sponsors"""
        # Create a level to delete
        create_res = requests.post(
            f"{BASE_URL}/api/sponsorship-levels",
            json={"name": f"{TEST_PREFIX} Delete Test", "max_sponsors": 1, "display_order": 100},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        level_id = create_res.json()["id"]
        
        # Delete the level
        delete_res = requests.delete(
            f"{BASE_URL}/api/sponsorship-levels/{level_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_res.status_code == 200
        
        # Verify deleted
        all_levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        assert not any(l["id"] == level_id for l in all_levels)

    def test_delete_sponsorship_level_fails_with_sponsors(self, admin_token, check_base_url):
        """DELETE /api/sponsorship-levels/{id} fails if sponsors exist (400)"""
        # Get a level that has sponsors (Title Sponsor has Acme Corporation)
        levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        title_level = next((l for l in levels if l["name"] == "Title Sponsor"), None)
        if not title_level:
            pytest.skip("Title Sponsor level not found")
        
        # Try to delete - should fail because it has sponsors
        response = requests.delete(
            f"{BASE_URL}/api/sponsorship-levels/{title_level['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        assert "sponsors are using" in response.json()["detail"].lower() or "cannot delete" in response.json()["detail"].lower()

    def test_delete_nonexistent_level_returns_404(self, admin_token, check_base_url):
        """DELETE /api/sponsorship-levels/{nonexistent} returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/sponsorship-levels/nonexistent-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404


# ========================================
# Corporate Sponsors Tests
# ========================================

class TestCorporateSponsorsPublic:
    """Tests for public corporate sponsors endpoints"""

    def test_get_corporate_sponsors_returns_all_with_level_info(self, check_base_url):
        """GET /api/corporate-sponsors returns all sponsors with level info"""
        response = requests.get(f"{BASE_URL}/api/corporate-sponsors")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # Acme, Tech Giant, Green Energy seeded
        
        # Verify structure
        for sponsor in data:
            assert "id" in sponsor
            assert "name" in sponsor
            assert "level_id" in sponsor
            assert "level" in sponsor
            assert sponsor["level"] is not None
            assert "name" in sponsor["level"]

    def test_get_public_sponsors_returns_grouped_by_level(self, check_base_url):
        """GET /api/corporate-sponsors/public returns sponsors grouped by level"""
        response = requests.get(f"{BASE_URL}/api/corporate-sponsors/public")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify structure - grouped by level
        for group in data:
            assert "level" in group
            assert "sponsors" in group
            assert "id" in group["level"]
            assert "name" in group["level"]
            assert isinstance(group["sponsors"], list)
            
            # Verify each sponsor in group belongs to that level
            for sponsor in group["sponsors"]:
                assert sponsor["level_id"] == group["level"]["id"]


class TestCorporateSponsorsCRUD:
    """Tests for corporate sponsors CRUD (admin only)"""

    def test_create_corporate_sponsor_admin_only(self, admin_token, check_base_url):
        """POST /api/corporate-sponsors creates sponsor (admin only)"""
        # Get a level to assign
        levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        silver_level = next((l for l in levels if l["name"] == "Silver Sponsor"), None)
        if not silver_level:
            pytest.skip("Silver Sponsor level not found")
        
        payload = {
            "name": f"{TEST_PREFIX} New Sponsor",
            "level_id": silver_level["id"],
            "website_url": "https://testsponsor.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate-sponsors",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["level_id"] == silver_level["id"]
        assert data["website_url"] == "https://testsponsor.com"
        assert data["logo_url"] is None
        assert "id" in data

    def test_create_sponsor_fails_for_non_admin(self, walker_token, check_base_url):
        """POST /api/corporate-sponsors fails for non-admin (403)"""
        levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        
        response = requests.post(
            f"{BASE_URL}/api/corporate-sponsors",
            json={"name": "Should Fail", "level_id": levels[0]["id"]},
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403

    def test_create_sponsor_fails_with_invalid_level(self, admin_token, check_base_url):
        """POST /api/corporate-sponsors fails with invalid level_id (400)"""
        response = requests.post(
            f"{BASE_URL}/api/corporate-sponsors",
            json={"name": "Test", "level_id": "invalid-level-id"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    def test_create_sponsor_enforces_max_limit(self, admin_token, check_base_url):
        """POST /api/corporate-sponsors enforces max sponsors limit (Title=1)"""
        # Get Title level
        levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        title_level = next((l for l in levels if l["name"] == "Title Sponsor"), None)
        if not title_level:
            pytest.skip("Title Sponsor level not found")
        
        # Title sponsor has max=1 and already has Acme Corporation
        response = requests.post(
            f"{BASE_URL}/api/corporate-sponsors",
            json={"name": f"{TEST_PREFIX} Extra Title", "level_id": title_level["id"]},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        assert "maximum" in response.json()["detail"].lower()

    def test_update_corporate_sponsor(self, admin_token, check_base_url):
        """PUT /api/corporate-sponsors/{id} updates sponsor (admin only)"""
        # Get a sponsor to update
        sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        test_sponsor = next((s for s in sponsors if TEST_PREFIX in s["name"]), None)
        if not test_sponsor:
            pytest.skip("No test sponsor found to update")
        
        update_res = requests.put(
            f"{BASE_URL}/api/corporate-sponsors/{test_sponsor['id']}",
            json={"name": f"{TEST_PREFIX} Updated Sponsor", "website_url": "https://updated.com"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_res.status_code == 200
        
        # Verify update
        all_sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        updated = next((s for s in all_sponsors if s["id"] == test_sponsor["id"]), None)
        assert updated is not None
        assert updated["name"] == f"{TEST_PREFIX} Updated Sponsor"
        assert updated["website_url"] == "https://updated.com"

    def test_update_sponsor_fails_for_non_admin(self, walker_token, check_base_url):
        """PUT /api/corporate-sponsors/{id} fails for non-admin"""
        sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        if not sponsors:
            pytest.skip("No sponsors to test")
        
        response = requests.put(
            f"{BASE_URL}/api/corporate-sponsors/{sponsors[0]['id']}",
            json={"name": "Should Fail"},
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403

    def test_delete_corporate_sponsor(self, admin_token, check_base_url):
        """DELETE /api/corporate-sponsors/{id} deletes sponsor (admin only)"""
        # Create a sponsor to delete
        levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        silver_level = next((l for l in levels if l["name"] == "Silver Sponsor"), None)
        
        create_res = requests.post(
            f"{BASE_URL}/api/corporate-sponsors",
            json={"name": f"{TEST_PREFIX} Delete Sponsor", "level_id": silver_level["id"]},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        sponsor_id = create_res.json()["id"]
        
        # Delete the sponsor
        delete_res = requests.delete(
            f"{BASE_URL}/api/corporate-sponsors/{sponsor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_res.status_code == 200
        
        # Verify deleted
        all_sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        assert not any(s["id"] == sponsor_id for s in all_sponsors)

    def test_delete_sponsor_fails_for_non_admin(self, walker_token, check_base_url):
        """DELETE /api/corporate-sponsors/{id} fails for non-admin"""
        sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        if not sponsors:
            pytest.skip("No sponsors to test")
        
        response = requests.delete(
            f"{BASE_URL}/api/corporate-sponsors/{sponsors[0]['id']}",
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403

    def test_delete_nonexistent_sponsor_returns_404(self, admin_token, check_base_url):
        """DELETE /api/corporate-sponsors/{nonexistent} returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/corporate-sponsors/nonexistent-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404


# ========================================
# Logo Upload Tests
# ========================================

class TestLogoUpload:
    """Tests for corporate sponsor logo upload/delete"""

    def test_upload_logo(self, admin_token, check_base_url):
        """POST /api/corporate-sponsors/{id}/logo uploads logo file"""
        # Create a sponsor to test logo upload
        levels = requests.get(f"{BASE_URL}/api/sponsorship-levels").json()
        silver_level = next((l for l in levels if l["name"] == "Silver Sponsor"), None)
        
        create_res = requests.post(
            f"{BASE_URL}/api/corporate-sponsors",
            json={"name": f"{TEST_PREFIX} Logo Test", "level_id": silver_level["id"]},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        sponsor_id = create_res.json()["id"]
        
        # Create a simple 1x1 PNG image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_logo.png', io.BytesIO(png_data), 'image/png')}
        upload_res = requests.post(
            f"{BASE_URL}/api/corporate-sponsors/{sponsor_id}/logo",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert upload_res.status_code == 200
        
        data = upload_res.json()
        assert "logo_url" in data
        assert data["logo_url"].startswith("/api/uploads/")
        
        # Verify logo_url is set on sponsor
        sponsor = next((s for s in requests.get(f"{BASE_URL}/api/corporate-sponsors").json() if s["id"] == sponsor_id), None)
        assert sponsor["logo_url"] == data["logo_url"]

    def test_upload_logo_fails_for_non_admin(self, walker_token, check_base_url):
        """POST /api/corporate-sponsors/{id}/logo fails for non-admin"""
        sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        if not sponsors:
            pytest.skip("No sponsors to test")
        
        files = {'file': ('test.png', io.BytesIO(b'fake'), 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/corporate-sponsors/{sponsors[0]['id']}/logo",
            files=files,
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403

    def test_upload_logo_fails_for_nonexistent_sponsor(self, admin_token, check_base_url):
        """POST /api/corporate-sponsors/{nonexistent}/logo returns 404"""
        files = {'file': ('test.png', io.BytesIO(b'fake'), 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/corporate-sponsors/nonexistent-id/logo",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404

    def test_upload_logo_rejects_invalid_file_type(self, admin_token, check_base_url):
        """POST /api/corporate-sponsors/{id}/logo rejects non-image files"""
        sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        test_sponsor = next((s for s in sponsors if TEST_PREFIX in s["name"]), None)
        if not test_sponsor:
            pytest.skip("No test sponsor found")
        
        files = {'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/corporate-sponsors/{test_sponsor['id']}/logo",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    def test_delete_logo(self, admin_token, check_base_url):
        """DELETE /api/corporate-sponsors/{id}/logo removes logo"""
        # Find a sponsor with a logo
        sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        sponsor_with_logo = next((s for s in sponsors if s.get("logo_url") and TEST_PREFIX in s["name"]), None)
        if not sponsor_with_logo:
            pytest.skip("No test sponsor with logo found")
        
        # Delete the logo
        delete_res = requests.delete(
            f"{BASE_URL}/api/corporate-sponsors/{sponsor_with_logo['id']}/logo",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_res.status_code == 200
        
        # Verify logo_url is now None
        updated = next((s for s in requests.get(f"{BASE_URL}/api/corporate-sponsors").json() if s["id"] == sponsor_with_logo["id"]), None)
        assert updated["logo_url"] is None

    def test_delete_logo_fails_for_non_admin(self, walker_token, check_base_url):
        """DELETE /api/corporate-sponsors/{id}/logo fails for non-admin"""
        sponsors = requests.get(f"{BASE_URL}/api/corporate-sponsors").json()
        if not sponsors:
            pytest.skip("No sponsors to test")
        
        response = requests.delete(
            f"{BASE_URL}/api/corporate-sponsors/{sponsors[0]['id']}/logo",
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 403

    def test_delete_logo_fails_for_nonexistent_sponsor(self, admin_token, check_base_url):
        """DELETE /api/corporate-sponsors/{nonexistent}/logo returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/corporate-sponsors/nonexistent-id/logo",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
