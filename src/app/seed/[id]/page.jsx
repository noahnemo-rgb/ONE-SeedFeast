import { ChevronLeft, MapPin, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AppFrame, GreenSpinner } from '../../components/frame';
import { useSession } from '../../components/session';

export default function SeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isReady } = useSession();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    setLoading(true);
    fetch(`/api/seeds/listings/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch listing');
        return response.json();
      })
      .then((data) => {
        setListing(data.listing);
        setReviews(data.reviews || []);
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function sendMessage() {
    if (!user) {
      navigate('/account/signin');
      return;
    }
    if (!message.trim()) return;
    setSendingMessage(true);
    try {
      const response = await fetch('/api/seeds/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          receiver_id: listing.user_id,
          message: message.trim(),
        }),
      });
      if (!response.ok) throw new Error('Failed to send');
      setMessage('');
      setNotice('Message sent.');
    } catch {
      setNotice('Could not send that message.');
    } finally {
      setSendingMessage(false);
    }
  }

  async function submitReview() {
    const response = await fetch('/api/seeds/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listing.id,
        reviewed_user_id: listing.user_id,
        rating,
        comment: reviewComment,
      }),
    });
    if (!response.ok) {
      setNotice('Sign in to write a review.');
      return;
    }
    setShowReviewForm(false);
    setReviewComment('');
    load();
  }

  if (loading) {
    return (
      <AppFrame tone="white">
        <GreenSpinner />
      </AppFrame>
    );
  }

  if (!listing) {
    return (
      <AppFrame>
        <p className="px-6 py-24 text-center">Listing not found</p>
      </AppFrame>
    );
  }

  return (
    <AppFrame tone="white">
      {listing.image ? (
        <div className="relative">
          <img src={listing.image} alt="" className="h-64 w-full object-cover" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/60"
          >
            <ChevronLeft color="#fff" size={24} />
          </button>
        </div>
      ) : (
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <button type="button" aria-label="Back" onClick={() => navigate(-1)}>
            <ChevronLeft color="#000" size={28} />
          </button>
        </div>
      )}
      <div className="px-5 pb-36 pt-5">
        {notice ? <p className="mb-3 text-sm text-[#059669]">{notice}</p> : null}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="mb-2 text-[28px] font-bold">{listing.title}</h1>
            {listing.category_name ? (
              <p className="text-base text-[#6B6B6B]">
                {listing.category_icon} {listing.category_name}
              </p>
            ) : null}
          </div>
          <span className={`rounded-2xl px-4 py-2 text-sm font-semibold ${listing.listing_type === 'offer' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
            {listing.listing_type === 'offer' ? 'Offering' : 'Requesting'}
          </span>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {listing.exchange_type === 'free' ? <span className="rounded-xl bg-[#ECFDF5] px-3 py-1.5 text-sm font-semibold text-[#059669]">FREE</span> : null}
          {listing.exchange_type === 'trade' ? <span className="rounded-xl bg-[#EFF6FF] px-3 py-1.5 text-sm font-semibold text-[#2563EB]">TRADE</span> : null}
          {listing.exchange_type === 'sell' && listing.price ? (
            <span className="text-2xl font-bold text-[#10B981]">${Number(listing.price).toFixed(2)}</span>
          ) : null}
          {listing.organic ? <span className="text-sm text-[#059669]">🌿 Organic</span> : null}
          {listing.heirloom ? <span className="text-sm text-[#8B5CF6]">👑 Heirloom</span> : null}
        </div>
        {listing.description ? <p className="mb-5 text-base leading-6 text-[#374151]">{listing.description}</p> : null}
        <div className="mb-5 space-y-3 rounded-xl bg-[#F9FAFB] p-4">
          <Detail label="Quantity" value={listing.quantity} />
          <Detail label="Growing Season" value={listing.growing_season} />
          <Detail label="Days to Harvest" value={listing.days_to_harvest} />
          <Detail label="Difficulty" value={listing.difficulty} />
          {listing.location_city ? (
            <div>
              <p className="mb-1 text-sm text-[#6B6B6B]">Location</p>
              <p className="flex items-center text-base font-semibold">
                <MapPin color="#10B981" size={16} />
                <span className="ml-1.5">
                  {listing.location_city}
                  {listing.location_state ? `, ${listing.location_state}` : ''}
                </span>
              </p>
            </div>
          ) : null}
        </div>
        <div className="mb-5 rounded-xl bg-[#F9FAFB] p-4">
          <p className="mb-3 text-lg font-bold">Listed by</p>
          <div className="flex items-center">
            {listing.user_image ? (
              <img src={listing.user_image} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E5E7EB] text-xl font-bold text-[#6B6B6B]">
                {listing.user_name?.charAt(0) || '?'}
              </span>
            )}
            <div className="ml-3">
              <p className="font-semibold">{listing.user_name || 'Unknown'}</p>
              {listing.avg_rating > 0 ? (
                <p className="mt-1 flex items-center text-sm text-[#6B6B6B]">
                  <Star color="#F59E0B" size={16} fill="#F59E0B" />
                  <span className="ml-1">
                    {Number(listing.avg_rating).toFixed(1)} ({listing.review_count} reviews)
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Reviews ({reviews.length})</h2>
          {isReady && user && user.id !== listing.user_id && !showReviewForm ? (
            <button type="button" className="text-sm font-semibold text-[#10B981]" onClick={() => setShowReviewForm(true)}>
              Write Review
            </button>
          ) : null}
        </div>
        {showReviewForm ? (
          <div className="mb-3 rounded-xl bg-[#F9FAFB] p-4">
            <p className="mb-2 font-semibold">Your Rating</p>
            <div className="mb-3 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" aria-label={`${star} stars`} onClick={() => setRating(star)}>
                  <Star size={32} color="#F59E0B" fill={star <= rating ? '#F59E0B' : 'transparent'} />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Share your experience..."
              className="mb-3 w-full rounded-lg bg-white p-3 text-sm"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowReviewForm(false)} className="flex-1 rounded-lg bg-[#E5E7EB] py-3 text-sm font-semibold text-[#6B6B6B]">
                Cancel
              </button>
              <button type="button" onClick={submitReview} className="flex-1 rounded-lg bg-[#10B981] py-3 text-sm font-semibold text-white">
                Submit
              </button>
            </div>
          </div>
        ) : null}
        {reviews.map((review) => (
          <div key={review.id} className="mb-3 rounded-xl bg-[#F9FAFB] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E7EB] text-sm font-bold">
                {review.reviewer_name?.charAt(0) || '?'}
              </span>
              <span className="font-semibold">{review.reviewer_name}</span>
              <span className="ml-auto text-[#F59E0B]">{'★'.repeat(review.rating)}</span>
            </div>
            {review.comment ? <p className="text-sm text-[#374151]">{review.comment}</p> : null}
          </div>
        ))}
        {!user ? (
          <p className="text-sm text-[#6B6B6B]">
            <Link to="/account/signin" className="font-semibold text-[#10B981]">
              Sign in
            </Link>{' '}
            to message this grower.
          </p>
        ) : null}
      </div>
      {user ? (
        <div className="sticky bottom-0 border-t border-[#E5E7EB] bg-white px-5 py-3">
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message the grower..."
              className="flex-1 rounded-xl bg-[#F3F4F6] px-4 py-3"
            />
            <button type="button" disabled={sendingMessage} onClick={sendMessage} className="rounded-xl bg-[#10B981] px-4 font-semibold text-white">
              Send
            </button>
          </div>
        </div>
      ) : null}
    </AppFrame>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 text-sm text-[#6B6B6B]">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
