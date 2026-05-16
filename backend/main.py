from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
from .database import get_supabase

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BidRequest(BaseModel):
    tg_id: int
    auction_id: str
    max_bid_amount: float

@app.get("/api/auction/active")
async def get_active_auction():
    supabase = get_supabase()
    
    # Get active auction with car details
    response = supabase.table("auctions") \
        .select("*, cars(*)") \
        .eq("status", "active") \
        .order("end_at", desc=False) \
        .limit(1) \
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="No active auction found")
    
    return response.data[0]

@app.post("/api/bid")
async def place_bid(bid: BidRequest):
    supabase = get_supabase()
    
    # 1. Get auction details
    auction_res = supabase.table("auctions").select("*").eq("id", bid.auction_id).execute()
    if not auction_res.data:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    auction = auction_res.data[0]
    if auction["status"] != "active":
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    now = datetime.utcnow()
    end_at = datetime.fromisoformat(auction["end_at"].replace("Z", "+00:00")).replace(tzinfo=None)
    
    if now > end_at:
        raise HTTPException(status_code=400, detail="Auction has ended")

    # 2. Get user from tg_id
    user_res = supabase.table("users").select("id").eq("tg_id", bid.tg_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user_res.data[0]["id"]

    # 3. Check if this is a duplicate bid or lower than current price
    if bid.max_bid_amount <= auction["current_price"]:
        raise HTTPException(status_code=400, detail="Bid must be higher than current price")

    # 4. Insert or update the bid
    # We use upsert if we want to allow users to increase their max bid
    supabase.table("bids").upsert({
        "auction_id": bid.auction_id,
        "user_id": user_id,
        "max_bid_amount": bid.max_bid_amount,
        "created_at": now.isoformat()
    }).execute()

    # 5. Calculate new current_price using Vickrey model
    # Get all bids for this auction sorted by max_bid_amount
    all_bids_res = supabase.table("bids").select("*").eq("auction_id", bid.auction_id).order("max_bid_amount", desc=True).execute()
    all_bids = all_bids_res.data
    
    start_price = auction["start_price"]
    bid_step = auction["bid_step"]
    
    if len(all_bids) == 1:
        # Only one bid
        new_current_price = start_price + bid_step
    else:
        # Multiple bids
        max_bid = all_bids[0]["max_bid_amount"]
        second_max_bid = all_bids[1]["max_bid_amount"]
        new_current_price = second_max_bid + bid_step
        
        # Ensure current_price doesn't exceed max_bid
        if new_current_price > max_bid:
            new_current_price = max_bid

    # 6. Anti-sniping logic
    new_end_at = auction["end_at"]
    time_left = (end_at - now).total_seconds()
    if time_left <= 60:
        extended_end_at = now + timedelta(seconds=60)
        new_end_at = extended_end_at.isoformat()

    # 7. Update auction
    update_data = {
        "current_price": new_current_price,
        "end_at": new_end_at
    }
    
    # If this bid is now the highest, we could update winner_id too, 
    # but usually winner is determined when auction ends.
    # For MVP, let's just keep track of current highest.
    
    supabase.table("auctions").update(update_data).eq("id", bid.auction_id).execute()

    return {"status": "success", "current_price": new_current_price, "end_at": new_end_at}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
