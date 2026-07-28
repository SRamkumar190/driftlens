import { useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ReviewWorkspace } from './components/ReviewWorkspace';

const currentRoute = () => window.location.pathname === '/review' ? '/review' : '/';

export default function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const navigate = useCallback((
    nextRoute: '/' | '/review',
    { replace = false }: { replace?: boolean } = {},
  ) => {
    const updateHistory = replace ? window.history.replaceState : window.history.pushState;
    updateHistory.call(window.history, {}, '', nextRoute);
    setRoute(nextRoute);
    if (typeof window.scrollTo === 'function' && !navigator.userAgent.includes('jsdom')) {
      window.scrollTo({ top: 0 });
    }
  }, []);

  return route === '/review'
    ? <ReviewWorkspace requiresUpload onBack={() => navigate('/', { replace: true })} />
    : <LandingPage onLaunchDemo={() => navigate('/review')} />;
}
