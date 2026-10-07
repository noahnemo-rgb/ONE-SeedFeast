import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronLeft, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { AppFrame, Spinner } from '../components/frame';
import { useSession } from '../components/session';

export default function MyRecipesScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, isReady } = useSession();
  const recipesQuery = useQuery({
    queryKey: ['my-recipes'],
    queryFn: async () => {
      const response = await fetch('/api/recipes/mine');
      if (!response.ok) throw new Error('Failed to fetch my recipes');
      return response.json();
    },
    enabled: isAuthenticated,
  });
  const recipes = Array.isArray(recipesQuery.data) ? recipesQuery.data : [];

  return (
    <AppFrame tone="white">
      <header className="flex items-center justify-between px-4 py-4">
        <button type="button" aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display text-lg font-semibold">My Recipes</h1>
        <Link to="/create-recipe" aria-label="Create recipe">
          <Plus size={24} color="#FF6A3D" />
        </Link>
      </header>
      {!isReady || (isAuthenticated && recipesQuery.isLoading) ? (
        <Spinner />
      ) : !isAuthenticated ? (
        <Empty title="Sign in to see your recipes">
          <Link to="/account/signin" className="rounded-full bg-[#FF6A3D] px-6 py-3 font-semibold text-white">
            Sign in
          </Link>
        </Empty>
      ) : recipes.length === 0 ? (
        <Empty title="You have not shared a recipe yet">
          <Link to="/create-recipe" className="inline-flex items-center gap-2 rounded-full bg-[#FF6A3D] px-6 py-3 font-semibold text-white">
            <Plus size={18} color="#FFFFFF" />
            Create Recipe
          </Link>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 p-5">
          {recipes.map((recipe) => (
            <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="overflow-hidden rounded-2xl bg-[#F8F8F8]">
              <img src={recipe.image} alt="" className="h-28 w-full object-cover" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold">{recipe.title}</p>
                <p className="mt-2 flex justify-between text-[11px] font-medium text-[#FF6A3D]">
                  <span>{recipe.time}</span>
                  <span>{recipe.difficulty}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppFrame>
  );
}

function Empty({ title, children }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F3F4F6]">
        <BookOpen size={32} color="#8C8C8C" />
      </div>
      <p className="mb-6 text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}
