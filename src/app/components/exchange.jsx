export function exchangeKind(listing) {
  if (listing.listing_type === 'request') return 'request';
  if (listing.exchange_type === 'fund') return 'fund';
  if (listing.exchange_type === 'sell') return 'shop';
  if (listing.exchange_type === 'trade') return 'trade';
  return 'gift';
}

export function exchangeMark(listing) {
  return {
    request: 'Looking for',
    fund: 'Fund',
    shop: 'Shop',
    trade: 'Trade',
    gift: 'Gift',
  }[exchangeKind(listing)];
}

export function exchangeLabel(listing) {
  const kind = exchangeKind(listing);
  if (kind === 'request') return 'Looking for';
  if (kind === 'shop') {
    return listing.price ? `$${Number(listing.price).toFixed(2)}` : 'Shop';
  }
  if (kind === 'trade') return 'Trade';
  if (kind === 'fund') return 'Fund';
  return 'Gift';
}

export function fundProgress(listing) {
  const goal = Number(listing.price) || 0;
  const raised = Number(listing.funded_amount) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  return { goal, raised, pct, backers: Number(listing.backer_count) || 0 };
}

export function FundMeter({ listing, compact = false }) {
  const { goal, raised, pct, backers } = fundProgress(listing);
  return (
    <div className={compact ? '' : 'min-w-[9rem]'}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-[#8A3E24]">${raised.toFixed(0)} backed</span>
        <span className="text-[#6B534C]">of ${goal.toFixed(0)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#F3E6DF]">
        <div className="h-full rounded-full bg-[#C45C26]" style={{ width: `${pct}%` }} />
      </div>
      {compact ? null : (
        <p className="mt-1 text-[11px] text-[#6B534C]">
          {backers} {backers === 1 ? 'member' : 'members'}
        </p>
      )}
    </div>
  );
}
