import { useQuery } from '@tanstack/react-query';
import { Heart, Search } from 'lucide-react';
import { Link } from 'react-router';
import { AppFrame, Spinner } from '../components/frame';
import { useSession } from '../components/session';

export default function BookmarksScreen() {
  const { isAuthenticated, isReady } = useSession();
  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await fetch('/api/recipes/favorites');
      if (!response.ok) throw new Error('Failed to fetch favorites');
      return response.json();
    },
    enabled: isAuthenticated,
  });
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];

  return (
    <AppFrame showTabs>
      <header className="border-b border-[#F3F4F6] bg-white px-5 py-4">
        <h1 className="font-display text-2xl font-semibold">Bookmarks</h1>
      </header>
      {!isReady ? (
        <Spinner />
      ) : !isAuthenticated ? (
        <Empty title="Sign In to Save Recipes" subtitle={'Keep track of your favorite recipes\nby signing in to your account'}>
          <Link to="/profile" className="rounded-full bg-[#FF6A3D] px-8 py-3.5 text-base font-semibold text-white">
            Go to Profile
          </Link>
        </Empty>
      ) : favoritesQuery.isLoading ? (
        <Spinner />
      ) : favorites.length === 0 ? (
        <Empty title="No Bookmarks Yet" subtitle={'Recipes you favorite will appear here\nfor quick access later'}>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-full bg-[#FF6A3D] px-6 py-3.5 text-base font-semibold text-white"
          >
            <Search size={18} color="#FFFFFF" />
            Explore Recipes
          </Link>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 p-5">
          {favorites.map((recipe) => (
            <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <img src={recipe.image} alt="" className="h-[120px] w-full object-cover" />
              <div className="p-3">
                <p className="line-clamp-2 h-10 text-sm font-semibold">{recipe.title}</p>
                <p className="mb-2 truncate text-xs text-[#8C8C8C]">By {recipe.chef_name}</p>
                <div className="flex justify-between text-[11px] font-medium text-[#FF6A3D]">
                  <span>{recipe.time}</span>
                  <span>{recipe.difficulty}</span>
                </div>
              </div>
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/30">
                <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppFrame>
  );
}

function Empty({ title, subtitle, children }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 py-24 text-center">
      <div className="mb-6 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <Heart size={48} color="#8C8C8C" strokeWidth={1.5} />
      </div>
      <p className="mb-3 text-xl font-semibold">{title}</p>
      <p className="mb-8 whitespace-pre-line text-[15px] leading-[22px] text-[#6B7280]">{subtitle}</p>
      {children}
    </div>
  );
}
