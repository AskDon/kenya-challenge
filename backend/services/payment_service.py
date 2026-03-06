# Payment Service Module
# Centralized payment logic for future Stripe integration
# All payment-related models and utilities in one place

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==========================================
# Enums for Payment Status
# ==========================================

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    MOCK = "mock"  # For testing


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    KES = "KES"  # Kenyan Shilling


# ==========================================
# Payment Models
# ==========================================

class PricingLevel(BaseModel):
    """Walker registration pricing levels (e.g., Basic $25, Builder $97)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    amount: float
    currency: Currency = Currency.USD
    description: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        use_enum_values = True


class Donation(BaseModel):
    """Individual donation/pledge from a supporter"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    donor_id: str  # User ID of the supporter
    walker_id: str  # User ID of the walker being supported
    amount: float
    currency: Currency = Currency.USD
    pledge_type: str = "flat"  # "flat" or "per_km"
    pledge_per_km: Optional[float] = None
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    message: Optional[str] = None
    is_anonymous: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True


class Transaction(BaseModel):
    """All financial transactions (registrations, donations, refunds)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "registration", "donation", "refund"
    user_id: str
    amount: float
    currency: Currency = Currency.USD
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    reference_id: Optional[str] = None  # Links to donation_id or registration_id
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True


# ==========================================
# Payment Service Class
# ==========================================

class PaymentService:
    """
    Centralized payment service for handling all payment operations.
    Ready for Stripe integration - just implement the Stripe-specific methods.
    """
    
    def __init__(self, db, stripe_api_key: Optional[str] = None):
        self.db = db
        self.stripe_api_key = stripe_api_key
        self._stripe_enabled = stripe_api_key is not None
    
    @property
    def is_stripe_enabled(self) -> bool:
        return self._stripe_enabled
    
    # ==========================================
    # Pricing Level Operations
    # ==========================================
    
    async def get_pricing_levels(self, active_only: bool = True) -> List[dict]:
        """Get all pricing levels, optionally filtered by active status"""
        query = {"is_active": True} if active_only else {}
        levels = await self.db.pricing_levels.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)
        return levels
    
    async def get_pricing_level(self, level_id: str) -> Optional[dict]:
        """Get a specific pricing level by ID"""
        return await self.db.pricing_levels.find_one({"id": level_id}, {"_id": 0})
    
    async def create_pricing_level(self, level: PricingLevel) -> dict:
        """Create a new pricing level"""
        level_dict = level.dict()
        level_dict["created_at"] = level_dict["created_at"].isoformat()
        await self.db.pricing_levels.insert_one(level_dict)
        del level_dict["_id"]
        return level_dict
    
    async def update_pricing_level(self, level_id: str, updates: dict) -> Optional[dict]:
        """Update an existing pricing level"""
        result = await self.db.pricing_levels.update_one({"id": level_id}, {"$set": updates})
        if result.matched_count == 0:
            return None
        return await self.get_pricing_level(level_id)
    
    # ==========================================
    # Donation/Pledge Operations
    # ==========================================
    
    async def create_donation(self, donation: Donation) -> dict:
        """Create a new donation record"""
        donation_dict = donation.dict()
        donation_dict["created_at"] = donation_dict["created_at"].isoformat()
        if donation_dict.get("completed_at"):
            donation_dict["completed_at"] = donation_dict["completed_at"].isoformat()
        await self.db.donations.insert_one(donation_dict)
        del donation_dict["_id"]
        return donation_dict
    
    async def get_donation(self, donation_id: str) -> Optional[dict]:
        """Get a specific donation by ID"""
        return await self.db.donations.find_one({"id": donation_id}, {"_id": 0})
    
    async def get_donations_for_walker(self, walker_id: str) -> List[dict]:
        """Get all donations for a specific walker"""
        return await self.db.donations.find(
            {"walker_id": walker_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
    
    async def get_donations_by_donor(self, donor_id: str) -> List[dict]:
        """Get all donations made by a specific donor"""
        return await self.db.donations.find(
            {"donor_id": donor_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
    
    async def update_donation_status(
        self, 
        donation_id: str, 
        status: PaymentStatus,
        stripe_charge_id: Optional[str] = None
    ) -> Optional[dict]:
        """Update donation status (e.g., after payment confirmation)"""
        updates = {"status": status.value}
        if status == PaymentStatus.COMPLETED:
            updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        if stripe_charge_id:
            updates["stripe_charge_id"] = stripe_charge_id
        
        result = await self.db.donations.update_one({"id": donation_id}, {"$set": updates})
        if result.matched_count == 0:
            return None
        return await self.get_donation(donation_id)
    
    # ==========================================
    # Transaction Operations
    # ==========================================
    
    async def create_transaction(self, transaction: Transaction) -> dict:
        """Create a new transaction record"""
        tx_dict = transaction.dict()
        tx_dict["created_at"] = tx_dict["created_at"].isoformat()
        if tx_dict.get("updated_at"):
            tx_dict["updated_at"] = tx_dict["updated_at"].isoformat()
        await self.db.transactions.insert_one(tx_dict)
        del tx_dict["_id"]
        return tx_dict
    
    async def get_transaction(self, transaction_id: str) -> Optional[dict]:
        """Get a specific transaction by ID"""
        return await self.db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    async def get_user_transactions(self, user_id: str) -> List[dict]:
        """Get all transactions for a user"""
        return await self.db.transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
    
    async def update_transaction_status(
        self,
        transaction_id: str,
        status: PaymentStatus,
        stripe_charge_id: Optional[str] = None
    ) -> Optional[dict]:
        """Update transaction status"""
        updates = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if stripe_charge_id:
            updates["stripe_charge_id"] = stripe_charge_id
        
        result = await self.db.transactions.update_one({"id": transaction_id}, {"$set": updates})
        if result.matched_count == 0:
            return None
        return await self.get_transaction(transaction_id)
    
    # ==========================================
    # Stripe Integration Placeholders
    # ==========================================
    
    async def create_stripe_payment_intent(
        self,
        amount: float,
        currency: Currency,
        metadata: dict
    ) -> Optional[dict]:
        """
        Create a Stripe PaymentIntent for processing payments.
        
        To implement:
        1. Install stripe: pip install stripe
        2. Initialize stripe with API key
        3. Call stripe.PaymentIntent.create()
        
        Example implementation:
        ```
        import stripe
        stripe.api_key = self.stripe_api_key
        
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe uses cents
            currency=currency.lower(),
            metadata=metadata,
        )
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
        }
        ```
        """
        if not self._stripe_enabled:
            # Mock response for development
            return {
                "client_secret": f"mock_secret_{uuid.uuid4()}",
                "payment_intent_id": f"mock_pi_{uuid.uuid4()}",
                "mock": True,
            }
        
        # TODO: Implement actual Stripe integration
        raise NotImplementedError("Stripe integration not yet implemented")
    
    async def confirm_stripe_payment(self, payment_intent_id: str) -> dict:
        """
        Confirm a Stripe payment after client-side confirmation.
        
        To implement:
        ```
        import stripe
        stripe.api_key = self.stripe_api_key
        
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "status": intent.status,
            "charge_id": intent.latest_charge,
        }
        ```
        """
        if not self._stripe_enabled:
            return {
                "status": "succeeded",
                "charge_id": f"mock_ch_{uuid.uuid4()}",
                "mock": True,
            }
        
        raise NotImplementedError("Stripe integration not yet implemented")
    
    async def process_stripe_webhook(self, payload: bytes, signature: str) -> dict:
        """
        Process Stripe webhook events for payment updates.
        
        To implement:
        ```
        import stripe
        stripe.api_key = self.stripe_api_key
        
        event = stripe.Webhook.construct_event(
            payload, signature, webhook_secret
        )
        
        if event.type == 'payment_intent.succeeded':
            # Update donation/transaction status
            pass
        elif event.type == 'payment_intent.payment_failed':
            # Handle failure
            pass
        ```
        """
        raise NotImplementedError("Stripe webhook handling not yet implemented")
    
    async def create_stripe_refund(
        self,
        charge_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None
    ) -> dict:
        """
        Create a refund for a Stripe charge.
        
        To implement:
        ```
        import stripe
        stripe.api_key = self.stripe_api_key
        
        refund = stripe.Refund.create(
            charge=charge_id,
            amount=int(amount * 100) if amount else None,
            reason=reason,
        )
        return {"refund_id": refund.id, "status": refund.status}
        ```
        """
        raise NotImplementedError("Stripe refund not yet implemented")
    
    # ==========================================
    # Reporting & Analytics
    # ==========================================
    
    async def get_total_raised(self, walker_id: Optional[str] = None) -> float:
        """Get total amount raised, optionally for a specific walker"""
        match = {"status": PaymentStatus.COMPLETED.value}
        if walker_id:
            match["walker_id"] = walker_id
        
        pipeline = [
            {"$match": match},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        result = await self.db.donations.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0.0
    
    async def get_donation_stats(self) -> dict:
        """Get overall donation statistics"""
        pipeline = [
            {"$match": {"status": PaymentStatus.COMPLETED.value}},
            {"$group": {
                "_id": None,
                "total_amount": {"$sum": "$amount"},
                "total_count": {"$sum": 1},
                "avg_amount": {"$avg": "$amount"},
            }}
        ]
        
        result = await self.db.donations.aggregate(pipeline).to_list(1)
        if result:
            return {
                "total_raised": result[0]["total_amount"],
                "donation_count": result[0]["total_count"],
                "average_donation": round(result[0]["avg_amount"], 2),
            }
        return {"total_raised": 0, "donation_count": 0, "average_donation": 0}
