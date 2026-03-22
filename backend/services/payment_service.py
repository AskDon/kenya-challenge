# Payment service - GiveButter integration placeholder
# KEF uses GiveButter for secure payment processing via embed widgets.
# This service provides utility functions for tracking donations.


class PaymentService:
    """
    GiveButter-based payment service.
    GiveButter handles all payment processing via embedded widgets on the frontend.
    This service tracks donation records in our database for reporting.
    """

    def __init__(self, db):
        self.db = db

    async def record_donation(self, walker_id: str, supporter_id: str, amount: float, source: str = "givebutter"):
        """Record a donation after GiveButter processes it"""
        from datetime import datetime, timezone
        import uuid

        donation = {
            "id": str(uuid.uuid4()),
            "walker_id": walker_id,
            "supporter_id": supporter_id,
            "amount": amount,
            "source": source,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.db.donations.insert_one(donation)
        return {k: v for k, v in donation.items() if k != "_id"}

    async def get_donations_for_walker(self, walker_id: str):
        """Get all donations for a specific walker"""
        donations = await self.db.donations.find(
            {"walker_id": walker_id},
            {"_id": 0}
        ).to_list(1000)
        return donations

    async def get_total_donated(self, walker_id: str) -> float:
        """Get total amount donated to a walker"""
        pipeline = [
            {"$match": {"walker_id": walker_id, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await self.db.donations.aggregate(pipeline).to_list(1)
        return round(result[0]["total"], 2) if result else 0
