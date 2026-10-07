import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { AppFrame } from './components/frame';
import { exchangeLabel } from './components/exchange';

const ways = [
  { title: 'Shop', detail: 'Buy packets, roots, and plants from the member who grew them', to: '/seeds?mode=shop' },
  { title: 'Trade', detail: 'Swap for a variety your garden is missing', to: '/seeds?mode=trade' },
  { title: 'Gift', detail: 'Pass extras on. No charge, still part of the cooperative', to: '/seeds?mode=gift' },
  { title: 'Fund', detail: 'Back a member who is keeping a rare line in the ground', to: '/seeds?mode=fund' },
];

const held = [
  { title: 'Seeds', detail: 'Ancient and heirloom packets' },
  { title: 'Roots', detail: 'Crowns, tubers, and divisions' },
  { title: 'Cuttings', detail: 'Slips that still know the parent plant' },
  { title: 'Plants', detail: 'Living starts ready for another garden' },
];

export default function HomeScreen() {
  useEffect(() => {
    document.title = 'SeedFeast — cooperative seed exchange';
  }, []);

  const listingsQuery = useQuery({
    queryKey: ['homeListings'],
    queryFn: async () => {
      const response = await fetch('/api/seeds/listings');
      if (!response.ok) throw new Error('Failed to fetch listings');
      return response.json();
    },
  });
  const recipesQuery = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return response.json();
    },
  });

  const listings = Array.isArray(listingsQuery.data) ? listingsQuery.data.slice(0, 4) : [];
  const recipes = Array.isArray(recipesQuery.data) ? recipesQuery.data.slice(0, 4) : [];

  return (
    <AppFrame showTabs>
      <section className="bg-[#F59C70] px-5 pb-8 pt-4 text-[#3B1718]">
        <img
          src="/seedfeast-logo.jpg"
          alt="Seed Feast Gourmet"
          className="mx-auto h-48 w-auto max-w-full object-contain"
        />
        <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em]">
          Worldwide cooperative
        </p>
        <h1 className="font-display mt-2 text-center text-[30px] font-bold leading-[1.15]">
          The niche exchange for ancient, heirloom, and gourmet seed.
        </h1>
        <p className="mx-auto mt-3 max-w-[34rem] text-center text-[15px] leading-relaxed">
          A community marketplace with the manners of a shop, a trade board, and a fund. Members sell, trade, gift, and
          fund the plants the world still has because someone kept them.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Link
            to="/seeds"
            className="rounded-full bg-[#3B1718] px-5 py-3.5 text-center text-base font-semibold text-[#FFF6EF]"
          >
            Browse the exchange
          </Link>
          <Link
            to="/create-seed-listing"
            className="rounded-full border-2 border-[#3B1718] px-5 py-3.5 text-center text-base font-semibold text-[#3B1718]"
          >
            List with the cooperative
          </Link>
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="font-display text-lg font-semibold">How the exchange works</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {ways.map((way) => (
            <Link
              key={way.title}
              to={way.to}
              className="rounded-2xl bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
            >
              <p className="font-display text-base font-semibold text-[#3B1718]">{way.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B534C]">{way.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="font-display text-lg font-semibold">What travels</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#6B534C]">
          Ancient, heirloom, and gourmet stock. Gourmet is the culinary heritage in the seed. The cooperative keeps that flavor moving.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {held.map((item) => (
            <li key={item.title} className="rounded-2xl bg-white px-3.5 py-3">
              <p className="text-sm font-semibold text-[#3B1718]">{item.title}</p>
              <p className="mt-0.5 text-xs text-[#6B534C]">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 pt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">On the exchange now</h2>
          <Link to="/seeds" className="shrink-0 text-sm font-semibold text-[#8A3E24]">
            See all
          </Link>
        </div>
        {listingsQuery.isLoading ? (
          <p className="text-sm text-[#6B534C]">Opening the vault…</p>
        ) : listingsQuery.isError ? (
          <p className="text-sm text-[#6B534C]">
            Listings are on the exchange.{' '}
            <Link to="/seeds" className="font-semibold text-[#8A3E24]">
              Browse the exchange
            </Link>
          </p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-[#6B534C]">
            The exchange is ready for the first listing.{' '}
            <Link to="/create-seed-listing" className="font-semibold text-[#8A3E24]">
              List one
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                to={`/seed/${listing.id}`}
                className="flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
              >
                {listing.image ? (
                  <img src={listing.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="h-20 w-20 shrink-0 rounded-xl bg-[#F59C70]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold leading-tight">{listing.title}</span>
                    <span className="shrink-0 rounded-full bg-[#FFF1E8] px-2 py-0.5 text-[11px] font-semibold text-[#8A3E24]">
                      {exchangeLabel(listing)}
                    </span>
                  </span>
                  <span className="mt-1 block text-[13px] text-[#6B534C]">
                    {[listing.location_city, listing.location_state].filter(Boolean).join(', ') || 'Community grower'}
                    {listing.origin ? ` · ${listing.origin}` : ''}
                    {listing.heirloom ? ' · Heirloom' : ''}
                    {listing.category_name ? ` · ${listing.category_name}` : ''}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6B534C]">{listing.user_name}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-5 mb-2 mt-8 rounded-2xl border border-[#E7D9D2] bg-white/70 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A3E24]">Culinary heritage</p>
        <h2 className="font-display mt-1 text-base font-semibold">Gourmet is the flavor in the seed</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#6B534C]">
          Gourmet names the culinary heritage in the seed — the flavor a variety was kept alive for. Recipes stay here when you cook what you grew or were given.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          <Link to="/feast" className="text-[#8A3E24] underline decoration-[#E7C2B2] underline-offset-4">
            Cook with what you have
          </Link>
          <Link to="/search" className="text-[#8A3E24] underline decoration-[#E7C2B2] underline-offset-4">
            Recipe notes
          </Link>
        </div>
        {recipes.length > 0 ? (
          <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}`}
                className="w-40 shrink-0 overflow-hidden rounded-xl bg-[#F8F8F8]"
              >
                {recipe.image ? <img src={recipe.image} alt="" className="h-20 w-full object-cover" /> : null}
                <span className="block truncate px-2.5 py-2 text-xs font-medium">{recipe.title}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </AppFrame>
  );
}
