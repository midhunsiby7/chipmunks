from fastapi import APIRouter

from app.api.v1.endpoints import health

api_router = APIRouter()

# Core operational routes
api_router.include_router(health.router, tags=["Health"])

# Future planned sub-routers to be registered during feature implementation:
# api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# api_router.include_router(users.router, prefix="/users", tags=["Users"])
# api_router.include_router(products.router, prefix="/products", tags=["Products"])
# api_router.include_router(plans.router, prefix="/plans", tags=["Plans"])
# api_router.include_router(quotations.router, prefix="/quotations", tags=["Quotations"])
# api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])
# api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
# api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
# api_router.include_router(taxes.router, prefix="/taxes", tags=["Taxes"])
# api_router.include_router(discounts.router, prefix="/discounts", tags=["Discounts"])
# api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
