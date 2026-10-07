import { ChevronLeft, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppFrame } from '../components/frame';
import { useSession } from '../components/session';

const field = 'w-full rounded-xl bg-[#F3F4F6] px-4 py-3.5 text-base placeholder:text-[#9CA3AF]';

export default function CreateSeedListing() {
  const navigate = useNavigate();
  const { isAuthenticated, isReady } = useSession();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: null,
    category_id: null,
    quantity: '',
    listing_type: 'offer',
    exchange_type: 'free',
    price: '',
    location_city: '',
    location_state: '',
    growing_season: '',
    days_to_harvest: '',
    difficulty: 'Medium',
    organic: false,
    heirloom: false,
  });

  useEffect(() => {
    fetch('/api/seeds/categories')
      .then((response) => response.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  function setField(patch) {
    setFormData((current) => ({ ...current, ...patch }));
  }

  function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField({ image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }
    if ((formData.exchange_type === 'sell' || formData.exchange_type === 'fund') && !formData.price) {
      setError(formData.exchange_type === 'fund' ? 'Please enter a funding goal' : 'Please enter a price');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/seeds/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create listing');
      navigate(`/seed/${data.listing.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (isReady && !isAuthenticated) {
    return (
      <AppFrame>
        <div className="px-8 py-24 text-center">
          <p className="mb-2 text-xl font-semibold">Sign in to list with the cooperative</p>
          <Link to="/account/signin" className="mt-4 inline-block rounded-xl bg-[#10B981] px-6 py-3 font-bold text-white">
            Sign in
          </Link>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame tone="white">
      <header className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
        <button type="button" aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft color="#000" size={28} />
        </button>
        <h1 className="text-lg font-bold">List with the cooperative</h1>
        <span className="w-7" />
      </header>
      <div className="space-y-5 px-5 py-5 pb-28">
        <div>
          <FieldLabel>Photo</FieldLabel>
          {formData.image ? (
            <div className="relative">
              <img src={formData.image} alt="" className="h-[200px] w-full rounded-xl object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setField({ image: null })}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60"
              >
                <X color="#fff" size={20} />
              </button>
            </div>
          ) : (
            <label className="flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-sm text-[#6B6B6B]">
              <Upload color="#6B6B6B" size={40} />
              <span className="mt-2">Tap to upload photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          )}
        </div>
        <div>
          <FieldLabel>Title *</FieldLabel>
          <input className={field} placeholder="e.g., Chufa tubers from a dry bed" value={formData.title} onChange={(event) => setField({ title: event.target.value })} />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea className={`${field} h-24`} placeholder="A shop packet, a trade, a gift, or a fund to keep the line in the ground." value={formData.description} onChange={(event) => setField({ description: event.target.value })} />
          <Link to="/assist?purpose=listing" className="mt-2 inline-block text-sm font-semibold text-[#8A3E24]">
            Ask for help writing this listing
          </Link>
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setField({ category_id: cat.id })}
                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${
                  formData.category_id === cat.id ? 'bg-[#10B981] text-white' : 'bg-[#F3F4F6] text-[#6B6B6B]'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
        <Choice label="I want to *" value={formData.listing_type} onChange={(listing_type) => setField({ listing_type })} options={[['offer', 'Offer a line'], ['request', 'Looking for']]} />
        <Choice label="How it moves *" value={formData.exchange_type} onChange={(exchange_type) => setField({ exchange_type })} options={[['free', 'Gift'], ['trade', 'Trade'], ['sell', 'Shop'], ['fund', 'Fund']]} />
        {formData.exchange_type === 'sell' || formData.exchange_type === 'fund' ? (
          <div>
            <FieldLabel>{formData.exchange_type === 'fund' ? 'Funding goal *' : 'Price *'}</FieldLabel>
            <input className={field} placeholder="0.00" inputMode="decimal" value={formData.price} onChange={(event) => setField({ price: event.target.value })} />
            {formData.exchange_type === 'fund' ? (
              <p className="mt-2 text-sm text-[#6B534C]">Members back this amount so you can keep the line. Message them to collect the pledge.</p>
            ) : null}
          </div>
        ) : null}
        <div>
          <FieldLabel>Quantity</FieldLabel>
          <input className={field} placeholder="e.g., 50 seeds, 1 packet" value={formData.quantity} onChange={(event) => setField({ quantity: event.target.value })} />
        </div>
        <div>
          <FieldLabel>Location</FieldLabel>
          <div className="flex gap-3">
            <input className={field} placeholder="City" value={formData.location_city} onChange={(event) => setField({ location_city: event.target.value })} />
            <input className={field} placeholder="State" value={formData.location_state} onChange={(event) => setField({ location_state: event.target.value })} />
          </div>
        </div>
        <div>
          <FieldLabel>Growing Season</FieldLabel>
          <input className={field} placeholder="e.g., Spring, Summer" value={formData.growing_season} onChange={(event) => setField({ growing_season: event.target.value })} />
        </div>
        <div>
          <FieldLabel>Days to Harvest</FieldLabel>
          <input className={field} placeholder="e.g., 60-80 days" value={formData.days_to_harvest} onChange={(event) => setField({ days_to_harvest: event.target.value })} />
        </div>
        <Choice label="Growing Difficulty" value={formData.difficulty} onChange={(difficulty) => setField({ difficulty })} options={[['Easy', 'Easy'], ['Medium', 'Medium'], ['Hard', 'Hard']]} />
        <Toggle label="🌿 Organic" checked={formData.organic} onClick={() => setField({ organic: !formData.organic })} />
        <Toggle label="👑 Heirloom" checked={formData.heirloom} onClick={() => setField({ heirloom: !formData.heirloom })} />
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
      </div>
      <div className="sticky bottom-0 border-t border-[#E5E7EB] bg-white px-5 py-4">
        <button type="button" disabled={loading} onClick={handleSubmit} className="w-full rounded-xl bg-[#3B1718] py-4 text-base font-bold text-[#FFF6EF] disabled:opacity-60">
          {loading ? 'Creating...' : 'Publish to the exchange'}
        </button>
      </div>
    </AppFrame>
  );
}

function FieldLabel({ children }) {
  return <p className="mb-2 text-base font-semibold">{children}</p>;
}

function Choice({ label, value, onChange, options }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-xl px-4 py-3.5 text-sm font-semibold ${
              value === option ? 'bg-[#3B1718] text-[#FFF6EF]' : 'bg-[#F6EFEA] text-[#6B534C]'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center rounded-xl bg-[#F3F4F6] p-4 text-left text-base">
      <span className={`mr-3 h-6 w-6 rounded-full border-2 ${checked ? 'border-[#10B981] bg-[#10B981]' : 'border-[#D1D5DB] bg-white'}`} />
      {label}
    </button>
  );
}
