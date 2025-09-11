import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auctionsAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Eye,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

interface Auction {
  id: number;
  item_name: string;
  description: string;
  starting_price: number;
  bid_increment: number;
  highest_bid: number;
  highest_bidder_id: string | null;
  status: string;
  go_live_date: string;
  end_date: string;
  seller_id: string;
  created_at: string;
}

export const LiveAuctionsPage: React.FC = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLiveAuctions();
    // Set up polling for real-time updates
    const interval = setInterval(fetchLiveAuctions, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLiveAuctions = async () => {
    try {
      const response = await auctionsAPI.getLive({ limit: 50 });
      setAuctions(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch live auctions");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPrice = (auction: Auction) => {
    return auction.highest_bid || auction.starting_price;
  };

  const getTimeLeft = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - now.getTime();

    if (timeDiff <= 0) return "Ended";

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getUrgencyColor = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - now.getTime();
    const minutesLeft = timeDiff / (1000 * 60);

    if (minutesLeft <= 5) return "text-red-600 bg-red-100";
    if (minutesLeft <= 15) return "text-orange-600 bg-orange-100";
    if (minutesLeft <= 60) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const LiveAuctionCard: React.FC<{ auction: Auction }> = ({ auction }) => {
    const currentPrice = getCurrentPrice(auction);
    const timeLeft = getTimeLeft(auction.end_date);
    const urgencyColor = getUrgencyColor(auction.end_date);

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-green-500">
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Zap className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-green-600 font-semibold text-sm">
                LIVE NOW
              </span>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${urgencyColor}`}
            >
              <Timer className="w-3 h-3 inline mr-1" />
              {timeLeft}
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {auction.item_name}
          </h3>

          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {auction.description}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Current Price:</span>
              <div className="font-bold text-green-600 text-lg">
                ${currentPrice.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Bid Increment:</span>
              <div className="font-semibold">
                ${auction.bid_increment.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Started: {format(new Date(auction.go_live_date), "MMM dd, HH:mm")}
            </div>
            <Link to={`/auctions/${auction.id}`}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Eye className="w-4 h-4 mr-2" />
                Join Auction
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Zap className="w-8 h-8 text-green-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Live Auctions</h1>
          </div>
          <p className="text-gray-600">
            {auctions.length > 0
              ? `${auctions.length} auctions currently live - Join the bidding!`
              : "No live auctions at the moment"}
          </p>
        </div>

        {/* Live Status Banner */}
        {auctions.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Live updates enabled - Auctions refresh automatically every 10
                  seconds
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Live Auctions Grid */}
        {auctions.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No live auctions
            </h3>
            <p className="text-gray-600 mb-4">
              Check back later or create your own auction to get started!
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/auctions">
                <Button variant="outline">View All Auctions</Button>
              </Link>
              <Link to="/create-auction">
                <Button>Create Auction</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <LiveAuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {auctions.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Live Auction Stats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {auctions.length}
                </div>
                <div className="text-sm text-gray-600">Active Auctions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  $
                  {auctions
                    .reduce((sum, auction) => sum + getCurrentPrice(auction), 0)
                    .toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Current Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {
                    auctions.filter((auction) => {
                      const timeLeft = getTimeLeft(auction.end_date);
                      return (
                        timeLeft !== "Ended" &&
                        timeLeft.includes("m") &&
                        parseInt(timeLeft.split("m")[0]) <= 5
                      );
                    }).length
                  }
                </div>
                <div className="text-sm text-gray-600">Ending Soon (≤5min)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
