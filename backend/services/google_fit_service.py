# Google Fit Integration Service
# Handles OAuth and step data retrieval from Google Fit API

import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
import os


class GoogleFitService:
    """
    Service for integrating with Google Fit API to retrieve step count data.
    
    Setup required:
    1. Create project in Google Cloud Console
    2. Enable Fitness API
    3. Create OAuth 2.0 credentials
    4. Set environment variables:
       - GOOGLE_FIT_CLIENT_ID
       - GOOGLE_FIT_CLIENT_SECRET
       - GOOGLE_FIT_REDIRECT_URI
    """
    
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_FIT_API_URL = "https://www.googleapis.com/fitness/v1"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    # Scopes required for reading step data
    SCOPES = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/fitness.activity.read",
    ]
    
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        redirect_uri: Optional[str] = None
    ):
        self.client_id = client_id or os.environ.get("GOOGLE_FIT_CLIENT_ID")
        self.client_secret = client_secret or os.environ.get("GOOGLE_FIT_CLIENT_SECRET")
        self.redirect_uri = redirect_uri or os.environ.get("GOOGLE_FIT_REDIRECT_URI")
        
        self._is_configured = all([self.client_id, self.client_secret, self.redirect_uri])
    
    @property
    def is_configured(self) -> bool:
        """Check if Google Fit integration is properly configured"""
        return self._is_configured
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate the Google OAuth authorization URL.
        
        Args:
            state: Random string to prevent CSRF attacks
            
        Returns:
            URL to redirect user to for Google authorization
        """
        if not self._is_configured:
            raise ValueError("Google Fit integration not configured. Set environment variables.")
        
        scope_str = " ".join(self.SCOPES)
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": scope_str,
            "access_type": "offline",  # Get refresh token
            "prompt": "consent",  # Force consent to get refresh token
            "state": state,
        }
        
        query_string = "&".join(f"{key}={value}" for key, value in params.items())
        return f"{self.GOOGLE_AUTH_URL}?{query_string}"
    
    async def exchange_code_for_tokens(self, code: str) -> Dict[str, str]:
        """
        Exchange authorization code for access and refresh tokens.
        
        Args:
            code: Authorization code from Google callback
            
        Returns:
            Dict with access_token, refresh_token, and expires_in
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=30.0
            )
            response.raise_for_status()
            tokens = response.json()
            
            return {
                "access_token": tokens.get("access_token"),
                "refresh_token": tokens.get("refresh_token"),
                "expires_in": tokens.get("expires_in", 3600),
                "token_type": tokens.get("token_type", "Bearer"),
            }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """
        Refresh an expired access token using the refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Dict with new access_token and expires_in
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=30.0
            )
            response.raise_for_status()
            tokens = response.json()
            
            return {
                "access_token": tokens.get("access_token"),
                "expires_in": tokens.get("expires_in", 3600),
            }
    
    async def get_user_info(self, access_token: str) -> Dict:
        """
        Get user information from Google using access token.
        
        Args:
            access_token: Valid Google access token
            
        Returns:
            Dict with user id, email, name, picture
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def get_daily_steps(
        self,
        access_token: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """
        Retrieve daily step count data from Google Fit.
        
        Uses the aggregated 'estimated_steps' data source which provides
        the same step count as shown in the Google Fit app.
        
        Args:
            access_token: Valid Google access token with fitness.activity.read scope
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            List of dicts with date and steps for each day
        """
        start_time_millis = int(start_date.timestamp() * 1000)
        end_time_millis = int(end_date.timestamp() * 1000)
        
        # Request body for aggregated step data
        request_body = {
            "aggregateBy": [{
                "dataTypeName": "com.google.step_count.delta",
                "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
            }],
            "bucketByTime": {"durationMillis": 86400000},  # 24 hours
            "startTimeMillis": start_time_millis,
            "endTimeMillis": end_time_millis,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.GOOGLE_FIT_API_URL}/users/me/dataset:aggregate",
                json=request_body,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
        
        # Parse aggregated data into daily steps
        steps_data = []
        for bucket in data.get("bucket", []):
            bucket_start = bucket.get("startTimeMillis")
            
            for dataset in bucket.get("dataset", []):
                for point in dataset.get("point", []):
                    values = point.get("value", [])
                    if values:
                        steps = values[0].get("intVal", 0)
                        date_obj = datetime.fromtimestamp(int(bucket_start) / 1000, tz=timezone.utc)
                        steps_data.append({
                            "date": date_obj.date().isoformat(),
                            "steps": steps,
                            "timestamp_ms": bucket_start,
                        })
        
        return steps_data
    
    async def get_step_count_today(self, access_token: str) -> int:
        """
        Get step count for today.
        
        Args:
            access_token: Valid Google access token
            
        Returns:
            Number of steps taken today
        """
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        steps_data = await self.get_daily_steps(access_token, today, tomorrow)
        return steps_data[0]["steps"] if steps_data else 0
    
    async def get_data_sources(self, access_token: str) -> List[Dict]:
        """
        List all available fitness data sources for the user.
        
        Useful for debugging to see what data sources are available.
        
        Args:
            access_token: Valid Google access token
            
        Returns:
            List of data source configurations
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.GOOGLE_FIT_API_URL}/users/me/dataSources",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
        
        return data.get("dataSource", [])


# Singleton instance for easy import
google_fit_service = GoogleFitService()
