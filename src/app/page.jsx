import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, Star, Trophy } from 'lucide-react';
import { Link } from 'react-router';
import { AppFrame, Spinner } from './components/frame';

export default function HomeScreen() {
  const chefQuery = useQuery({
    queryKey: ['featuredChef'],
    queryFn: async () => {
      const response = await fetch('/api/chefs/featured');
      if (!response.ok) throw new Error('Failed to fetch featured chef');
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

  const featuredChef = chefQuery.data;
  const recipes = Array.isArray(recipesQuery.data) ? recipesQuery.data : [];

  return (
    <AppFrame showTabs>
      <header className="flex items-center justify-between bg-white px-5 pb-5 pt-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111111]">Hello, Foodie! 👋</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">What are we cooking today?</p>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3F4F6]"
        >
          <Bell size={24} color="#111111" />
        </button>
      </header>

      {chefQuery.isLoading || recipesQuery.isLoading ? (
        <Spinner />
      ) : (
        <div className="pb-4">
          <Link
            to="/feast"
            className="mx-5 mt-6 block rounded-[20px] bg-[#6d4c2f] px-5 py-4 text-[#fffaf3] shadow-sm"
          >
            <p className="font-display text-lg font-semibold">Cook with what you have</p>
            <p className="mt-1 text-sm text-[#f6f1e7]">From seed to gourmet feast. Name what is on hand.</p>
          </Link>

          {featuredChef ? (
            <section className="mt-6 px-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={20} color="#FFD700" />
                <h2 className="font-display text-lg font-semibold">Chef of the Week</h2>
              </div>
              <Link
                to={`/chef/${featuredChef.id}`}
                className="flex items-center rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
              >
                <img
                  src={featuredChef.avatar}
                  alt=""
                  className="mr-4 h-20 w-20 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6A3D] px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
                    Featured
                  </span>
                  <p className="mt-1 text-lg font-bold">{featuredChef.name}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-[#6B7280]">
                    {featuredChef.bio || 'Master of gourmet flavors and creative culinary arts.'}
                  </p>
                  <p className="mt-2 text-xs font-medium">
                    {featuredChef.followers} Followers
                    <span className="mx-2 inline-block h-[3px] w-[3px] rounded-full bg-[#D1D5DB]" />
                    {featuredChef.likes} Likes
                  </p>
                </div>
                <ChevronRight size={20} color="#8C8C8C" />
              </Link>
            </section>
          ) : null}

          <section className="mt-6 px-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Popular Recipes</h2>
              <Link to="/search" className="text-sm font-medium text-[#FF6A3D]">
                See All
              </Link>
            </div>
            <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2">
              {recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  className="w-60 shrink-0 overflow-hidden rounded-[20px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
                >
                  <img src={recipe.image} alt="" className="h-40 w-full object-cover" />
                  <div className="p-4">
                    <p className="truncate text-base font-semibold">{recipe.title}</p>
                    <p className="mt-1 text-[13px] text-[#6B7280]">
                      {recipe.time}
                      <span className="mx-2 inline-block h-[3px] w-[3px] rounded-full bg-[#D1D5DB]" />
                      {recipe.difficulty}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppFrame>
  );
}
