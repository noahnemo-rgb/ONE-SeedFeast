import { MapPin, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppFrame, GreenSpinner } from '../components/frame';
import { useSession } from '../components/session';

export default function SeedsHome() {
  const navigate = useNavigate();
  const { user, isReady } = useSession();
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/seeds/categories')
      .then((response) => response.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedType !== 'all') params.set('type', selectedType);
    if (searchQuery) params.set('search', searchQuery);
    setLoading(true);
    fetch(`/api/seeds/listings?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedType, searchQuery]);

  return (
    <AppFrame showTabs tone="white">
      <div className="px-5 pb-5 pt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-bold">Seed Share</h1>
            <p className="mt-1 text-base text-[#6B6B6B]">Grow your garden together 🌱</p>
          </div>
          {isReady && user ? (
            <button
              type="button"
              aria-label="Create seed listing"
              onClick={() => navigate('/create-seed-listing')}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]"
            >
              <Plus color="#fff" size={24} />
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex items-center rounded-xl bg-[#F3F4F6] px-4 py-3">
          <Search color="#6B6B6B" size={20} />
          <input
            placeholder="Search seeds..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="ml-3 flex-1 bg-transparent text-base placeholder:text-[#9CA3AF]"
          />
        </div>

        <div className="mb-4 flex gap-2">
          {[
            ['all', 'All'],
            ['offer', 'Offers'],
            ['request', 'Requests'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedType(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                selectedType === value ? 'bg-[#10B981] text-white' : 'bg-[#F3F4F6] text-[#6B6B6B]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <FilterChip active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
            All Categories
          </FilterChip>
          {categories.map((cat) => (
            <FilterChip key={cat.id} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)}>
              {cat.icon} {cat.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="px-5 pb-8">
        {loading ? (
          <GreenSpinner />
        ) : listings.length === 0 ? (
          <p className="mt-10 text-center text-lg text-[#6B6B6B]">
            No seed listings found.
            <br />
            Be the first to share!
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((listing) => (
              <Link key={listing.id} to={`/seed/${listing.id}`} className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                {listing.image ? <img src={listing.image} alt="" className="h-[200px] w-full object-cover" /> : null}
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{listing.title}</p>
                      {listing.scientific_name ? (
                        <p className="text-sm italic text-[#6B6B6B]">{listing.scientific_name}</p>
                      ) : null}
                      {listing.origin ? (
                        <p className="mt-0.5 text-xs text-[#6B6B6B]">Origin: {listing.origin}</p>
                      ) : null}
                      {listing.category_name ? (
                        <p className="mt-1 text-sm text-[#6B6B6B]">
                          {listing.category_icon} {listing.category_name}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                        listing.listing_type === 'offer' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      {listing.listing_type === 'offer' ? 'Offering' : 'Requesting'}
                    </span>
                  </div>
                  {listing.description ? <p className="mb-3 line-clamp-2 text-sm text-[#6B6B6B]">{listing.description}</p> : null}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {listing.exchange_type === 'free' ? <Badge className="bg-[#ECFDF5] text-[#059669]">FREE</Badge> : null}
                      {listing.exchange_type === 'trade' ? <Badge className="bg-[#EFF6FF] text-[#2563EB]">TRADE</Badge> : null}
                      {listing.exchange_type === 'sell' && listing.price ? (
                        <span className="text-base font-bold text-[#10B981]">${Number(listing.price).toFixed(2)}</span>
                      ) : null}
                      {listing.organic ? <span className="text-[#059669]">🌿 Organic</span> : null}
                      {listing.heirloom ? <span className="text-[#8B5CF6]">👑 Heirloom</span> : null}
                    </div>
                    {listing.location_city ? (
                      <span className="flex items-center text-[#6B6B6B]">
                        <MapPin size={14} color="#6B6B6B" />
                        <span className="ml-1">
                          {listing.location_city}
                          {listing.location_state ? `, ${listing.location_state}` : ''}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center border-t border-[#F3F4F6] pt-3">
                    {listing.user_image ? (
                      <img src={listing.user_image} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E7EB] text-sm font-bold text-[#6B6B6B]">
                        {listing.user_name?.charAt(0) || '?'}
                      </span>
                    )}
                    <span className="ml-2 text-sm text-[#6B6B6B]">{listing.user_name || 'Unknown'}</span>
                    {listing.avg_rating > 0 ? (
                      <span className="ml-auto text-sm text-[#F59E0B]">
                        ⭐ {Number(listing.avg_rating).toFixed(1)} ({listing.review_count})
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {!isReady || !user ? (
        <div className="sticky bottom-20 bg-[#10B981] px-5 py-4">
          <Link to="/account/signin" className="block rounded-xl bg-white py-4 text-center text-base font-bold text-[#10B981]">
            Sign in to share seeds
          </Link>
        </div>
      ) : null}
    </AppFrame>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
        active ? 'bg-[#10B981] text-white' : 'bg-[#F3F4F6] text-[#6B6B6B]'
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ className, children }) {
  return <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}
